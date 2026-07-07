import { NextRequest, NextResponse } from 'next/server'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
import { addLineItem, getCart } from '@/services/core/external/medusa-client'
import { getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
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
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return storeCartErrorResponse('read_only_inspection', 403)
    }
    throw error
  }

  try {
    const customer = await getCustomer()
    if (!customer) {
      return storeCartErrorResponse('authentication_required', 401)
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return storeCartErrorResponse('invalid_request_body', 400)
    }

    const payload = body as Record<string, unknown>
    const cartId = typeof payload.cartId === 'string' ? payload.cartId.trim() : ''
    const { product, variant_id, quantity } = payload

    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    if (quantity !== undefined && quantity !== 1) {
      return storeCartErrorResponse('quantity_must_be_one', 400)
    }

    const { offers } = await getProOfferCatalog()
    const checkoutInput: ProOfferCheckoutInput = {
      product: typeof product === 'string' ? product : undefined,
      variant: typeof variant_id === 'string' ? variant_id : undefined,
    }
    const selection = resolveProOfferCheckoutSelection(offers, checkoutInput)

    if (!selection) {
      return storeCartErrorResponse('current_pro_offer_required', 400)
    }

    // Bind the cart to the caller (carts carry the session customer's email).
    const existingCart = await getCart(cartId)
    if (!existingCart || existingCart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    const cart = await addLineItem(cartId, {
      variant_id: selection.variantId,
      quantity: 1,
    })

    if (!cart) {
      return storeCartErrorResponse('failed_add_item', 500)
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error adding line item: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
