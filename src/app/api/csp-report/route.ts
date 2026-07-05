import { NextResponse } from 'next/server'
import { infraLogger } from '@/lib/logger'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

/**
 * CSP violation report sink.
 *
 * The site ships a Content-Security-Policy-Report-Only header (see
 * next.config.ts). Report-only never blocks — its only job is to POST a report
 * here whenever the page does something the policy would forbid, so we can
 * verify the policy is clean against real checkout/analytics traffic before
 * promoting it to an enforcing header.
 *
 * Two wire formats reach this route:
 *   - report-uri  (Safari/Firefox, legacy) → Content-Type application/csp-report,
 *     body { "csp-report": { "violated-directive", "blocked-uri", ... } }
 *   - report-to   (Chromium, Reporting API) → Content-Type application/reports+json,
 *     body [ { "type": "csp-violation", "body": { "effectiveDirective", "blockedURL", ... } } ]
 *
 * Reports go to infraLogger (Loki/Sentry) — NOT the sale/Discord path — since a
 * CSP violation is diagnostic, not something to page anyone about. Always
 * returns 204: a broken/abusive report must never surface to the visitor.
 */

// Real reports are a few hundred bytes. Reject anything larger so this
// unauthenticated endpoint can't be used to push large bodies into the logs.
const MAX_BODY_BYTES = 8_192

// Unauthenticated, browser-driven endpoint — cap abuse per IP. A page with
// violations may emit a small burst on load; 60/min leaves headroom while
// stopping a spammer from flooding the log sink. Fail-open.
const limiter = createRateLimiter({
  prefix: 'csp:report:ip',
  limit: 60,
  window: '1 m',
})

/**
 * Collapse an attacker-influenced report field to a single bounded line so a
 * caller can't inject newlines/control chars into the log message.
 */
function sanitizeField(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return 'unknown'
  return value.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, '').slice(0, 256)
}

interface NormalizedViolation {
  directive: string
  blockedUri: string
  documentUri: string
}

/** Normalize both the legacy report-uri and modern report-to payload shapes. */
function extractViolations(body: unknown): NormalizedViolation[] {
  // Legacy report-uri: { "csp-report": {...} }
  if (body && typeof body === 'object' && 'csp-report' in body) {
    const r = (body as Record<string, Record<string, unknown>>)['csp-report'] ?? {}
    return [
      {
        directive: sanitizeField(r['violated-directive'] ?? r['effective-directive']),
        blockedUri: sanitizeField(r['blocked-uri']),
        documentUri: sanitizeField(r['document-uri']),
      },
    ]
  }

  // Reporting API report-to: an array of report objects.
  if (Array.isArray(body)) {
    return body
      .filter((r) => r && typeof r === 'object' && r.type === 'csp-violation')
      .map((r) => {
        const b = (r.body ?? {}) as Record<string, unknown>
        return {
          directive: sanitizeField(b.effectiveDirective ?? b.violatedDirective),
          blockedUri: sanitizeField(b.blockedURL),
          documentUri: sanitizeField(b.documentURL),
        }
      })
  }

  return []
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

    const violations = extractViolations(JSON.parse(raw))
    for (const v of violations) {
      infraLogger.warn`CSP violation: directive=${v.directive} blocked=${v.blockedUri} document=${v.documentUri}`
    }
  } catch {
    // Malformed body — swallow. Report collection must never 500 the browser.
  }
  return noContent
}
