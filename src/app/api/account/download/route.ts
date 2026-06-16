import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { verifyDownloadToken } from '@/lib/download-token'
import { isReleaseAllowedForLicenses } from '@/lib/license'
import { findReleaseByVersion } from '@/services/core/business/pro-downloads'
import { fetchReleaseAsset } from '@/services/core/external/github-asset'
import { licenseLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Deliberately no fallback to the customer JWT: a request-scoped
  // bearer token must never be used as an HMAC signing secret.
  const secret = env.DOWNLOAD_TOKEN_SECRET || env.KEYGEN_API_TOKEN
  if (!secret) {
    licenseLogger.error`Download token secret not configured for customer ${customer.id}`
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
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  const release = await findReleaseByVersion(payload.version)
  if (!release) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 })
  }

  const { licenses } = await getResolvedCustomerLicenses()
  if (!isReleaseAllowedForLicenses(release, licenses)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const served = await fetchReleaseAsset(release)
  if (!served) {
    licenseLogger.error`Failed to fetch release asset after retries. version=${release.version} customer=${customer.id}`
    return NextResponse.json(
      { error: 'Failed to fetch release asset' },
      { status: 502 }
    )
  }

  return new NextResponse(served.stream, {
    status: 200,
    headers: {
      'Content-Type': served.contentType,
      'Content-Disposition': `attachment; filename="${served.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
