import { NextRequest, NextResponse } from 'next/server'
import {
  capturePayPalOrder,
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
 * POST /api/store/cart/paypal/capture
 *
 * Captures an approved PayPal order before cart completion. This is still
 * pre-completion and therefore retryable; the order-pending/money-at-risk path
 * remains reserved for failures after capture when Medusa cannot create an
 * order.
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const cartId = typeof payload.cartId === 'string' ? payload.cartId.trim() : ''
    const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : ''

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'PayPal order ID is required' },
        { status: 400 }
      )
    }

    const cart = await getCart(cartId)
    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    if (cart.email !== customer.email) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    const { offers } = await getProOfferCatalog()
    const selection = resolveProOfferCartSelection(offers, cart)
    if (!selection) {
      return NextResponse.json(
        { error: 'Current Pro offer cart is required' },
        { status: 400 }
      )
    }

    const authToken = await getAuthToken()
    const captured = await capturePayPalOrder(cartId, orderId, authToken)
    if (!captured) {
      return NextResponse.json(
        { error: 'Failed to capture PayPal order' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    storeLogger.error`Error capturing PayPal order: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
