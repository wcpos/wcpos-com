import { NextRequest, NextResponse } from 'next/server'
import { readAnalyticsConsentFromCookieHeader } from '@/lib/analytics/consent'
import {
  buildCheckoutAttributionMetadata,
  parsePostHogSessionId,
} from '@/lib/analytics/checkout-attribution'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import { getAuthToken, getCustomer } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import { storeCartErrorResponse } from '@/lib/store-cart-errors'
import { getCart, updateCart } from '@/services/core/external/medusa-client'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Refreshes the server-owned completion attribution immediately before a real
 * payment attempt. Cart metadata is the source for the bounded checkout
 * context; browser JSON supplies only the current PostHog session UUID.
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
    if (!isRecord(body)) {
      return storeCartErrorResponse('invalid_request_body', 400)
    }

    const cartId = typeof body.cartId === 'string' ? body.cartId.trim() : ''
    if (!cartId) {
      return storeCartErrorResponse('cart_id_required', 400)
    }

    const currentCart = await getCart(cartId)
    if (!currentCart || currentCart.email !== customer.email) {
      return storeCartErrorResponse('cart_not_found', 404)
    }

    const metadata = isRecord(
      (currentCart as typeof currentCart & { metadata?: unknown }).metadata
    )
      ? (currentCart as typeof currentCart & {
          metadata: Record<string, unknown>
        }).metadata
      : {}
    const sessionId = parsePostHogSessionId(body.session_id)
    const consent = readAnalyticsConsentFromCookieHeader(
      request.headers.get('cookie')
    )
    const attribution =
      consent === 'granted' && sessionId
        ? buildCheckoutAttributionMetadata({
            consentedDistinctId: request.cookies.get(
              ANALYTICS_DISTINCT_ID_COOKIE
            )?.value,
            sessionId,
            locale: metadata.locale,
            experiment: metadata.experiment,
            variant: metadata.variant,
          })
        : undefined

    const authToken = await getAuthToken()
    const cart = await updateCart(
      cartId,
      {
        email: customer.email,
        metadata: { wcpos_analytics: attribution?.wcpos_analytics ?? null },
      },
      authToken
    )

    if (!cart) {
      return storeCartErrorResponse('failed_update_cart', 500)
    }

    return NextResponse.json({ cart })
  } catch (error) {
    storeLogger.error`Error refreshing cart analytics attribution: ${error}`
    return storeCartErrorResponse('internal', 500)
  }
}
