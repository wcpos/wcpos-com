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

// Beacon payloads are tiny ({kind, reference, source, details}). Reject anything
// larger so a single caller can't push large bodies through the alert path.
const MAX_BODY_BYTES = 2_048

/**
 * Strip the attacker-controlled reference to the WCPOS reference charset and
 * cap its length, so a caller can't inject newlines/markdown into the Discord
 * alert message (this endpoint is unauthenticated — never log it raw).
 */
function sanitizeReference(value: unknown): string {
  if (typeof value !== 'string') return 'none'
  const cleaned = value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64)
  return cleaned.length > 0 ? cleaned : 'none'
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 204 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const kind = typeof body.kind === 'string' ? body.kind : 'unknown'

    if (MONEY_AT_RISK.has(kind)) {
      // fatal → Discord (rate-limit-bypassed for wcpos.store.sale) + Sentry.
      saleLogger.fatal`Checkout failure (money at risk): ${kind} ref=${sanitizeReference(
        body.reference
      )}`
    }
  } catch {
    // Malformed body — swallow. Alerting must never 500 the browser.
  }
  return new NextResponse(null, { status: 204 })
}
