import { NextRequest, NextResponse } from 'next/server'
import {
  createCustomerSession,
  createPaymentCollection,
  createPaymentSession,
  getCart,
} from '@/services/core/external/medusa-client'
import { getAuthToken, getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import {
  getProOfferCatalog,
  resolveProOfferCartSelection,
} from '@/lib/pro-offer-catalog'

/**
 * POST /api/store/cart/payment-sessions
 *
 * Body:
 *   - cartId: string (required)
 *   - provider_id: string (optional, defaults to 'pp_stripe_stripe')
 *   - paymentCollectionId: string (optional — if provided, reuses existing collection)
 *
 * Returns: { cart, paymentCollectionId, clientSecret, paymentSessionId }
 */
export async function POST(request: NextRequest) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return NextResponse.json(
        { error: 'read_only_inspection' },
        { status: 403 }
      )
    }
    throw error
  }

  try {
    const customer = await getCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // getCustomer() above already validated this token against
    // /store/customers/me, which rejects a JWT with an empty actor_id — so a
    // non-null customer guarantees a token that resolves to a real customer.
    // Forwarding it downstream is what makes Medusa attach a persistent Stripe
    // Customer (cus_...) to the PaymentIntent instead of a "Guest".
    const authToken = await getAuthToken()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const cartId = typeof payload.cartId === 'string' ? payload.cartId.trim() : ''
    const providerId =
      typeof payload.provider_id === 'string' && payload.provider_id.trim()
        ? payload.provider_id.trim()
        : 'pp_stripe_stripe'
    const existingCollectionId =
      typeof payload.paymentCollectionId === 'string' &&
      payload.paymentCollectionId.trim()
        ? payload.paymentCollectionId.trim()
        : undefined

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    const currentCart = await getCart(cartId)
    if (!currentCart) {
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    // Bind the cart to the caller (carts carry the session customer's email).
    if (currentCart.email !== customer.email) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    const { offers } = await getProOfferCatalog()
    const selection = resolveProOfferCartSelection(offers, currentCart)
    if (!selection) {
      return NextResponse.json(
        { error: 'Current Pro offer cart is required' },
        { status: 400 }
      )
    }

    // The cart is the source of truth for its payment collection: a
    // caller-supplied id that doesn't match the cart's own collection (stale
    // tab, replaced session, or a different cart's id) must not attach
    // sessions to the wrong collection.
    const cartCollectionId = currentCart.payment_collection?.id
    if (
      existingCollectionId &&
      cartCollectionId &&
      existingCollectionId !== cartCollectionId
    ) {
      return NextResponse.json(
        { error: 'Payment collection does not belong to this cart' },
        { status: 400 }
      )
    }

    // Prefer the cart's own collection; create one only when none exists.
    let collectionId = cartCollectionId ?? existingCollectionId
    if (!collectionId) {
      const collection = await createPaymentCollection(cartId, authToken)
      if (!collection) {
        return NextResponse.json(
          { error: 'Failed to create payment collection' },
          { status: 500 }
        )
      }
      collectionId = collection.id
    }

    // Create session within the collection
    const session = await createPaymentSession(collectionId, providerId, authToken)
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create payment session' },
        { status: 500 }
      )
    }

    // Get the updated cart
    const cart = await getCart(cartId)
    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    // For a yearly card checkout, mint a Stripe CustomerSession so the Payment
    // Element can show its optional save-card checkbox. The payment session was
    // created just above, so the customer's Stripe account holder now exists.
    // Null for anything else (or on any error) → the storefront shows no
    // checkbox; it never blocks checkout.
    let customerSessionClientSecret: string | null = null
    if (providerId.startsWith('pp_stripe') && selection.planId === 'yearly') {
      customerSessionClientSecret = await createCustomerSession(cartId, authToken)
    }

    return NextResponse.json({
      cart,
      paymentCollectionId: collectionId,
      clientSecret: session.clientSecret,
      paymentSessionId: session.paymentSessionId,
      customerSessionClientSecret,
    })
  } catch (error) {
    storeLogger.error`Error with payment sessions: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
