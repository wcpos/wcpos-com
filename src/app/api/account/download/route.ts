import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { verifyDownloadToken } from '@/lib/download-token'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import { selectEntitledRelease } from '@/services/core/business/release-delivery'
import { fetchReleaseAsset } from '@/services/core/external/github-asset'
import { downloadLogger } from '@/lib/logger'
import { clientIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const ip = clientIp(request)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'

  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Deliberately no fallback: broader API/customer tokens must never be used
  // as an HMAC signing secret.
  const secret = env.DOWNLOAD_TOKEN_SECRET
  if (!secret) {
    // Infra broken — every paying customer is blocked. fatal → Discord + email.
    downloadLogger.fatal`Download token secret not configured (customer ${customer.id})`
    return NextResponse.json(
      { error: 'Download token secret not configured' },
      { status: 500 }
    )
  }

  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const payload = verifyDownloadToken(token, secret)
  if (!payload || payload.customerId !== customer.id) {
    downloadLogger.warn`Download denied: invalid/mismatched token. customer=${customer.id} ip=${ip}`
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  const releases = await getProPluginReleases()
  const { licenses } = await getResolvedCustomerLicenses()
  // Account-wide authorization is a deliberate union (ADR-0006): the token
  // proves the customer asked for this version; the union decides whether any
  // licence they hold entitles it.
  const selection = selectEntitledRelease(releases, payload.version, {
    kind: 'account',
    licences: licenses,
  })
  if (!selection.ok) {
    if (selection.reason === 'not_found') {
      downloadLogger.warn`Download denied: release not found. version=${payload.version} customer=${customer.id} ip=${ip}`
      return NextResponse.json({ error: 'Release not found' }, { status: 404 })
    }
    downloadLogger.warn`Download denied: not entitled. version=${payload.version} customer=${customer.id} ip=${ip}`
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const release = selection.release
  const served = await fetchReleaseAsset(release)
  if (!served) {
    // All sources failed for an entitled customer — delivery is broken. error →
    // Discord (download category bypasses the rate limit, never throttled).
    downloadLogger.error`Failed to fetch release asset after retries. version=${release.version} customer=${customer.id} ip=${ip}`
    return NextResponse.json(
      { error: 'Failed to fetch release asset' },
      { status: 502 }
    )
  }

  // Audit trail: who downloaded what, when, from where. info → Loki only.
  downloadLogger.info`Download served. customer=${customer.id} version=${release.version} asset=${served.filename} ip=${ip} ua=${userAgent}`

  return new NextResponse(served.stream, {
    status: 200,
    headers: {
      'Content-Type': served.contentType,
      'Content-Disposition': `attachment; filename="${served.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
