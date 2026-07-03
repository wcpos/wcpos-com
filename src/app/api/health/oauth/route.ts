import { NextRequest, NextResponse } from 'next/server'
import { checkOAuthProviders, HARD_FAILURE_STATUSES } from '@/lib/oauth-health'
import { authLogger } from '@/lib/logger'

/**
 * OAuth provider health check.
 *
 * GET/POST /api/health/oauth — probes each sign-in provider from the outside
 * and fires a fatal alert (Discord + email) when sign-in is broken, e.g. the
 * production callback URL is missing from a provider console after a domain
 * change. Runbook: docs/runbooks/oauth-providers.md
 */

// Probe fetches abort at 10s each, but give the whole run (parallel
// providers, one retry after a 5s delay) room to finish and report instead
// of dying in a silent platform timeout.
export const maxDuration = 60

/**
 * Zero-config guard: NO env var. Vercel's cron scheduler identifies itself
 * with a vercel-cron user-agent (sent unconditionally, no CRON_SECRET
 * needed); manual runs use the committed key below. Both are spoofable in
 * principle, and that is fine for this route's threat model: it is
 * read-only, probes only public URLs (`?base=` restricted to wcpos hosts),
 * and alert delivery is throttled per category by the sinks — the guard
 * keeps casual scanners from triggering outbound probes, it does not
 * protect data. Do NOT "upgrade" this to a secret env var: an unset var
 * means the cron 401s forever with zero signal.
 */
const CRON_KEY = 'wcpos-oauth-health-v4qx8r2n'

function isAuthorized(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') ?? ''
  if (userAgent.startsWith('vercel-cron/')) return true
  const authorization = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-cron-secret')
  return authorization === `Bearer ${CRON_KEY}` || cronHeader === CRON_KEY
}

/**
 * Probe the canonical public host — apex, per owner preference — never the
 * deployment-internal URL (cron requests arrive on the *.vercel.app host,
 * whose origin would make every redirect_uri look wrong). The checker follows
 * Vercel's primary-domain redirect (currently apex → www) itself, so it
 * validates whatever host customers actually end up on.
 */
const PROBE_BASE_URL = 'https://wcpos.com'

function resolveBaseUrl(request: NextRequest): string {
  const override = request.nextUrl.searchParams.get('base')
  if (override) {
    const url = new URL(override)
    const allowed =
      url.protocol === 'https:'
        ? url.hostname === 'wcpos.com' || url.hostname.endsWith('.wcpos.com')
        : url.protocol === 'http:' && url.hostname === 'localhost'
    if (!allowed) throw new Error(`Refusing to probe non-wcpos base: ${override}`)
    return url.origin
  }
  return PROBE_BASE_URL
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let baseUrl: string
  try {
    baseUrl = resolveBaseUrl(request)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
  const report = await checkOAuthProviders(baseUrl)

  const broken = report.results.filter((r) => HARD_FAILURE_STATUSES.includes(r.status))
  const inconclusive = report.results.filter((r) => r.status === 'inconclusive')

  // One aggregated fatal: the Discord/email sinks throttle per category, so
  // per-provider fatals fired in the same run would be dropped after the
  // first. Fatal is reserved for confirmed breakage; inconclusive (Google
  // rate limiting / bot defense) logs at error so it is visible without
  // paging hourly.
  if (broken.length > 0) {
    const summary = broken.map((r) => `${r.provider}: ${r.detail}`).join(' | ')
    authLogger.fatal`OAuth sign-in broken (${broken.map((r) => r.provider).join(', ')}) — ${summary}`
  }
  if (inconclusive.length > 0) {
    const summary = inconclusive.map((r) => `${r.provider}: ${r.detail}`).join(' | ')
    authLogger.error`OAuth health check inconclusive — ${summary}`
  }
  if (report.healthy && !report.inconclusive) {
    authLogger.info`OAuth provider health check passed for ${baseUrl}`
  }

  return NextResponse.json(
    {
      ok: report.healthy,
      inconclusive: report.inconclusive,
      baseUrl,
      results: report.results,
    },
    { status: report.healthy ? 200 : 500 }
  )
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
