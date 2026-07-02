import { NextRequest, NextResponse } from 'next/server'
import { addLineItem, getCart } from '@/services/core/external/medusa-client'
import { getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import {
  getProOfferCatalog,
  resolveProOfferCheckoutSelection,
  type ProOfferCheckoutInput,
} from '@/lib/pro-offer-catalog'

/**
 * POST /api/store/cart/line-items - Add item to cart
 */
export async function POST(request: NextRequest) {
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
    const { product, variant_id, quantity } = payload

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    if (quantity !== undefined && quantity !== 1) {
      return NextResponse.json(
        { error: 'Quantity must be 1 for Pro checkout' },
        { status: 400 }
      )
    }

    const { offers } = await getProOfferCatalog()
    const checkoutInput: ProOfferCheckoutInput = {
      product: typeof product === 'string' ? product : undefined,
      variant: typeof variant_id === 'string' ? variant_id : undefined,
    }
    const selection = resolveProOfferCheckoutSelection(offers, checkoutInput)

    if (!selection) {
      return NextResponse.json(
        { error: 'Current Pro offer is required' },
        { status: 400 }
      )
    }

    // Bind the cart to the caller (carts carry the session customer's email).
    const existingCart = await getCart(cartId)
    if (!existingCart || existingCart.email !== customer.email) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    const cart = await addLineItem(cartId, {
      variant_id: selection.variantId,
      quantity: 1,
    })

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to add item to cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error adding line item: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
