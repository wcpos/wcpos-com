import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { createDownloadToken } from '@/lib/download-token'
import { isReleaseAllowedForLicenses } from '@/lib/license'
import { findReleaseByVersion } from '@/services/core/business/pro-downloads'
import { downloadLogger } from '@/lib/logger'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

const TOKEN_TTL_MS = 60_000

// Per-customer gate. Generous (a real customer clicks download a handful of
// times) but stops a compromised session from minting tokens in a tight loop.
// Fail-open — a Redis hiccup must never block a paying customer's download.
const limiter = createRateLimiter({
  prefix: 'download:token:customer',
  limit: 30,
  window: '10 m',
})

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
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

    const { success } = await limiter.consume(customer.id)
    if (!success) {
      downloadLogger.warn`Download token rate limited. customer=${customer.id} ip=${ip}`
      return NextResponse.json(
        { error: 'Too many download requests. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const version = typeof body.version === 'string' ? body.version : 'latest'

    const release = await findReleaseByVersion(version)
    if (!release) {
      downloadLogger.warn`Download token requested for missing release version=${version} customer=${customer.id} ip=${ip}`
      return NextResponse.json({ error: 'Release not found' }, { status: 404 })
    }

    const { licenses } = await getResolvedCustomerLicenses()
    if (!isReleaseAllowedForLicenses(release, licenses)) {
      downloadLogger.warn`Download token forbidden. version=${release.version} customer=${customer.id} ip=${ip}`
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = createDownloadToken(
      {
        customerId: customer.id,
        version: release.version,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      },
      secret
    )

    downloadLogger.info`Download token issued. customer=${customer.id} version=${release.version} ip=${ip}`

    return NextResponse.json({
      downloadUrl: `/api/account/download?token=${encodeURIComponent(token)}`,
      version: release.version,
    })
  } catch (error) {
    downloadLogger.error`Download token endpoint failed: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
