import { NextResponse } from 'next/server'
import { saleLogger } from '@/lib/logger'

/**
 * Browser-reported checkout failure bridge.
 *
 * The money-taken-no-order failure happens in the browser (Stripe/PayPal
 * confirm client-side, then call completeCart). clientLogger only reaches
 * Loki/Sentry — never Discord. This endpoint re-emits the failure through the
 * SERVER saleLogger so Discord + Sentry fire. Deliberately NOT consent-gated:
 * operational alerting about a broken sale is legitimate-interest, not analytics.
 *
 * Always returns 204 — never let alerting break the customer's flow.
 */

// The kinds where money may have been taken without an order. Only these page.
const MONEY_AT_RISK = new Set(['order_pending', 'payment_uncertain'])

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const kind = typeof body.kind === 'string' ? body.kind : 'unknown'

    if (MONEY_AT_RISK.has(kind)) {
      // fatal → Discord (rate-limit-bypassed for wcpos.store.sale) + Sentry.
      saleLogger.fatal`Checkout failure (money at risk): ${kind} ref=${
        typeof body.reference === 'string' ? body.reference : 'none'
      }`
    }
  } catch {
    // Malformed body — swallow. Alerting must never 500 the browser.
  }
  return new NextResponse(null, { status: 204 })
}
