import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { completeCart, getCart } from '@/services/core/external/medusa-client'
import { getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import {
  resolveProCheckoutVariant,
  trackServerEvent,
} from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import { ApiError } from '@/lib/api/errors'
import { toErrorResponse } from '@/lib/api/to-error-response'
import {
  getProOfferCatalog,
  resolveProOfferCartSelection,
} from '@/lib/pro-offer-catalog'

/**
 * POST /api/store/cart/complete - Complete cart and create order
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

    const body = await request.json()
    const { cartId, experiment } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
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

    const { offers } = await getProOfferCatalog()
    const selection = resolveProOfferCartSelection(offers, cart)
    if (!selection) {
      return NextResponse.json(
        { error: 'Current Pro offer cart is required' },
        { status: 400 }
      )
    }

    const result = await completeCart(cartId)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to complete cart' },
        { status: 500 }
      )
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
      // { error, code } contract has a single, tested home.
      return toErrorResponse(
        new ApiError(409, 'Payment received, order pending', 'order_pending')
      )
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

      void trackServerEvent('checkout_completed', {
        experiment: typeof experiment === 'string' ? experiment : 'pro_checkout_v1',
        variant,
        distinct_id: distinctId ?? 'missing-distinct-id',
        customer_id: customer.id,
        order_id: result.order.id,
        cart_id: cartId,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
