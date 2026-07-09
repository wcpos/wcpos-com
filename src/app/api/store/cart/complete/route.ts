import { NextRequest, NextResponse } from 'next/server'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
import { cookies } from 'next/headers'
import { completeCart, getCart } from '@/services/core/external/medusa-client'
import { getAuthToken, getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import {
  resolveProCheckoutVariant,
  trackServerEvent,
} from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import {
  getProOfferCatalog,
  resolveProOfferCartSelection,
} from '@/lib/pro-offer-catalog'
import { ORDER_PENDING_CODE } from '@/lib/checkout-failure-taxonomy'

/**
 * POST /api/store/cart/complete - Complete cart and create order
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

    // getCustomer() above already validated this token; forward it so the
    // completion carries the cart's owning auth context and Medusa lets the
    // owning customer finalize it, linking the created order to them (#284).
    const authToken = await getAuthToken()

    const body = await request.json()
    const { cartId, experiment } = body

    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    const cart = await getCart(cartId)
    if (!cart) {
      return storeCartErrorResponse('failed_fetch_cart', 500)
    }

    // Bind the cart to the caller: only the customer a cart was created for
    // may complete it (carts always carry the session customer's email).
    if (cart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    const { offers } = await getProOfferCatalog()
    const selection = resolveProOfferCartSelection(offers, cart)
    if (!selection) {
      return storeCartErrorResponse('current_pro_offer_cart_required', 400)
    }

    const result = await completeCart(cartId, authToken)

    if (!result) {
      return storeCartErrorResponse('failed_complete_cart', 500)
    }

    // Medusa returns HTTP 200 with `type: 'cart'` (not an order) when the cart
    // could not be completed — so a non-null result is NOT proof an order
    // exists. Because completion only runs after the provider captured payment,
    // a missing order id means money may have been taken without an order. Treat
    // it as the distinct "order pending" state here rather than trusting the
    // browser to catch it, and do not fire the checkout_completed event for a
    // non-order. See the "Order pending" term in CONTEXT.md.
    if (!result.order?.id) {
      storeLogger.error`Cart completion produced no order: cartId=${cartId} type=${result.type}`
      // The one wire shape the checkout client and CONTEXT.md pin as the
      // distinct "Order pending" state. Routed through the shared adapter so the
      // { errorCode, code } contract has a single, tested home.
      return storeCartErrorResponse('order_pending', 409, { code: ORDER_PENDING_CODE })
    }

    try {
      const analyticsConfig = getAnalyticsConfig(process.env)
      const cookieStore = await cookies()
      const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
      const variant = distinctId
        ? await resolveProCheckoutVariant({
            distinctId,
            analyticsEnabled: analyticsConfig.enabled,
          })
        : 'control'

      // Fire-and-forget is safe here: trackServerEvent registers its own
      // delivery with the request's waitUntil, so the Vercel freeze after
      // the response cannot drop the conversion event.
      void trackServerEvent('checkout_completed', {
        experiment: typeof experiment === 'string' ? experiment : 'pro_checkout_v1',
        variant,
        // Prefer the landing-page anon id so it stitches onto the same person
        // as the shopper's visit; fall back to the unique customer.id (never a
        // shared placeholder, which would merge unrelated purchases into one
        // PostHog person and corrupt per-customer attribution). Mirrors the
        // signup_completed fallback in src/app/api/auth/register/route.ts.
        distinct_id: distinctId ?? customer.id,
        customer_id: customer.id,
        order_id: result.order.id,
        cart_id: cartId,
        // Revenue + plan: without these the funnel can only count sales, not
        // measure them. `revenue`/`currency` are the property names PostHog
        // revenue analytics recognises; `plan` splits yearly vs lifetime.
        // Medusa's completion response may return only the created order's
        // id/status, so fall back to the pre-completion cart totals (validated
        // above) rather than sending `undefined` revenue/currency.
        revenue: result.order.total ?? cart.total,
        currency: result.order.currency_code ?? cart.currency_code,
        plan: selection.planId,
        plan_handle: selection.handle,
        funnel_step: 'checkout_completed',
        page: '/pro/checkout',
      }).catch((trackingError) => {
        storeLogger.warn`Checkout conversion tracking failed: ${trackingError}`
      })
    } catch (trackingError) {
      storeLogger.warn`Checkout conversion tracking failed: ${trackingError}`
    }

    return NextResponse.json(result)
  } catch (error) {
    storeLogger.error`Error completing cart: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
