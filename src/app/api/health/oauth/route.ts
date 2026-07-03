import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { checkOAuthProviders } from '@/lib/oauth-health'
import { authLogger } from '@/lib/logger'

/**
 * OAuth provider health check.
 *
 * GET/POST /api/health/oauth — cron-guarded (same contract as
 * /api/discord/reconcile). Probes each sign-in provider from the outside and
 * fires a fatal alert (Discord + email) when sign-in is broken, e.g. the
 * production callback URL is missing from a provider console after a domain
 * change. Runbook: docs/runbooks/oauth-providers.md
 */

function isAuthorized(request: NextRequest): boolean {
  if (!env.CRON_SECRET) return false
  const authorization = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-cron-secret')
  return authorization === `Bearer ${env.CRON_SECRET}` || cronHeader === env.CRON_SECRET
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

  for (const result of report.results) {
    if (result.status === 'ok') continue
    authLogger.fatal`OAuth sign-in broken (${result.provider}): ${result.detail}`
  }

  if (report.healthy) {
    authLogger.info`OAuth provider health check passed for ${baseUrl}`
  }

  return NextResponse.json(
    { ok: report.healthy, baseUrl, results: report.results },
    { status: report.healthy ? 200 : 500 }
  )
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
