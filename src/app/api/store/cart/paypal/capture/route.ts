import { NextRequest, NextResponse } from 'next/server'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
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
    const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : ''

    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    if (!orderId) {
      return storeCartErrorResponse('paypal_order_id_required', 400)
    }

    const cart = await getCart(cartId)
    if (!cart) {
      return storeCartErrorResponse('failed_fetch_cart', 500)
    }

    if (cart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    const { offers } = await getProOfferCatalog()
    const selection = resolveProOfferCartSelection(offers, cart)
    if (!selection) {
      return storeCartErrorResponse('current_pro_offer_cart_required', 400)
    }

    const authToken = await getAuthToken()
    const captured = await capturePayPalOrder(cartId, orderId, authToken)
    if (!captured) {
      return storeCartErrorResponse('failed_capture_paypal_order', 502)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    storeLogger.error`Error capturing PayPal order: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
