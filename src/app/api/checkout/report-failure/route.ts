import { NextResponse } from 'next/server'
import { routineSaleLogger, saleLogger } from '@/lib/logger'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import { ownerSeverityForCheckoutFailure } from '@/lib/checkout-failure-taxonomy'

/**
 * Browser-reported checkout failure bridge.
 *
 * Payment failures happen in the browser (Stripe/PayPal confirm client-side,
 * then call completeCart). clientLogger only reaches Loki/Sentry — never
 * Discord. This endpoint re-emits the failure through the SERVER saleLogger so
 * Discord (+ email on fatal) fire. Deliberately NOT consent-gated: operational
 * alerting about a broken sale is legitimate-interest, not analytics.
 *
 * Always returns 204 — never let alerting break the customer's flow.
 */

// Beacon payloads are tiny ({kind, reference}). Reject anything
// larger so a single caller can't push large bodies through the alert path.
const MAX_BODY_BYTES = 2_048

// Unauthenticated endpoint — cap abuse with a generous per-IP limit. A real
// checkout emits at most a handful of these; 30/min leaves headroom while
// stopping a spammer from flooding the alert channel. Fail-open.
const limiter = createRateLimiter({
  prefix: 'checkout:report:ip',
  limit: 30,
  window: '1 m',
})

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
  const noContent = new NextResponse(null, { status: 204 })
  try {
    const declaredLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return noContent
    }

    // Over-limit callers are silently dropped (still 204) — never log them.
    const { success } = await limiter.consume(clientIp(request))
    if (!success) return noContent

    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return noContent
    const body = JSON.parse(raw) as Record<string, unknown>
    const kind = typeof body.kind === 'string' ? body.kind : 'unknown'
    const reference = sanitizeReference(body.reference)

    const ownerSeverity = ownerSeverityForCheckoutFailure(kind)

    if (ownerSeverity === 'fatal') {
      // fatal → Discord (rate-limit-bypassed for wcpos.store.sale) + email.
      saleLogger.fatal`Checkout failure (money at risk): ${kind} ref=${reference}`
    } else if (ownerSeverity === 'error') {
      // error → Discord only (Sentry filters the routine sale subcategory).
      routineSaleLogger.error`Checkout payment failure: ${kind} ref=${reference}`
    }
  } catch {
    // Malformed body — swallow. Alerting must never 500 the browser.
  }
  return noContent
}
