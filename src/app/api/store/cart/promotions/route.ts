import { NextRequest, NextResponse } from 'next/server'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
import {
  addCartPromotions,
  getCart,
} from '@/services/core/external/medusa-client'
import { getAuthToken, getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * POST /api/store/cart/promotions - Silently apply a promotion to a cart
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

    const authToken = await getAuthToken()
    const body = await request.json().catch(() => null)
    if (!isRecord(body)) {
      return storeCartErrorResponse('invalid_request_body', 400)
    }

    const cartId = typeof body.cartId === 'string' ? body.cartId.trim() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!cartId || !code || code.length > 64) {
      return storeCartErrorResponse('invalid_request_body', 400)
    }

    const existingCart = await getCart(cartId)
    if (!existingCart || existingCart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    const cart = await addCartPromotions(cartId, [code], authToken)
    if (!cart) {
      return storeCartErrorResponse('internal', 500)
    }

    const applied =
      cart.promotions?.some((promotion) => promotion.code === code) === true ||
      (cart.discount_total ?? 0) > 0

    return NextResponse.json({ cart, applied })
  } catch (error) {
    storeLogger.error`Error applying cart promotion: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
