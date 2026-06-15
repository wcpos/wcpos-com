import { NextResponse } from 'next/server'
import { saleLogger } from '@/lib/logger'

/**
 * Fires a synthetic fatal under wcpos.store.sale to prove Discord + Sentry are
 * wired in a given environment. Guarded: returns 404 in production unless
 * ALERT_TEST_TOKEN matches ?token=. Remove or keep behind the guard after launch.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token')
  if (process.env.NODE_ENV === 'production' && token !== process.env.ALERT_TEST_TOKEN) {
    return new NextResponse(null, { status: 404 })
  }
  saleLogger.fatal`SYNTHETIC alert-chain test ${new Date().toISOString()}`
  return NextResponse.json({ ok: true, sent: 'wcpos.store.sale fatal' })
}
