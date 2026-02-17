import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { completeCart } from '@/services/core/external/medusa-client'
import { getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import {
  resolveProCheckoutVariant,
  trackServerEvent,
} from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'

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

    const result = await completeCart(cartId)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to complete cart' },
        { status: 500 }
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
        order_id: result.order?.id ?? null,
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
