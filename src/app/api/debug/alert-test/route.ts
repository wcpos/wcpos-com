import { NextResponse } from 'next/server'
import { saleLogger } from '@/lib/logger'

/**
 * Fires a synthetic fatal under wcpos.store.sale to prove Discord + Sentry are
 * wired in a given environment. Guarded: returns 404 in production unless the
 * `x-alert-test-token` header matches ALERT_TEST_TOKEN. A header (not a query
 * param) avoids leaking the token into access logs / browser history. Remove or
 * keep behind the guard after launch.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const token = request.headers.get('x-alert-test-token')
  // Fail closed: an unset or EMPTY ALERT_TEST_TOKEN must never match — an
  // empty request header would equal an empty env var and fire the fatal.
  const expected = process.env.ALERT_TEST_TOKEN
  if (
    process.env.NODE_ENV === 'production' &&
    (!expected || token !== expected)
  ) {
    return new NextResponse(null, { status: 404 })
  }
  saleLogger.fatal`SYNTHETIC alert-chain test ${new Date().toISOString()}`
  return NextResponse.json({ ok: true, sent: 'wcpos.store.sale fatal' })
}
