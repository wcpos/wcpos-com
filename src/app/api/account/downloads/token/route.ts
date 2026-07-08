import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { createDownloadToken } from '@/lib/download-token'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import { selectEntitledRelease } from '@/services/core/business/release-delivery'
import { downloadLogger } from '@/lib/logger'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

const TOKEN_TTL_MS = 60_000

type DownloadTokenErrorCode =
  | 'unauthorized'
  | 'download_token_secret_missing'
  | 'rate_limited'
  | 'release_not_found'
  | 'forbidden'
  | 'internal'

function errorResponse(errorCode: DownloadTokenErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

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
      return errorResponse('unauthorized', 401)
    }

    // Deliberately no fallback: broader API/customer tokens must never be used
    // as an HMAC signing secret.
    const secret = env.DOWNLOAD_TOKEN_SECRET
    if (!secret) {
      // Infra broken — every paying customer is blocked. fatal → Discord + email.
      downloadLogger.fatal`Download token secret not configured (customer ${customer.id})`
      return errorResponse('download_token_secret_missing', 500)
    }

    const { success } = await limiter.consume(customer.id)
    if (!success) {
      downloadLogger.warn`Download token rate limited. customer=${customer.id} ip=${ip}`
      return errorResponse('rate_limited', 429)
    }

    const body = await request.json().catch(() => ({}))
    const version = typeof body.version === 'string' ? body.version : 'latest'

    const releases = await getProPluginReleases()
    const { licenses } = await getResolvedCustomerLicenses()
    const selection = selectEntitledRelease(releases, version, {
      kind: 'account',
      licences: licenses,
    })

    if (!selection.ok) {
      if (selection.reason === 'not_found') {
        downloadLogger.warn`Download token requested for missing release version=${version} customer=${customer.id} ip=${ip}`
        return errorResponse('release_not_found', 404)
      }
      downloadLogger.warn`Download token forbidden. version=${version} customer=${customer.id} ip=${ip}`
      return errorResponse('forbidden', 403)
    }

    const release = selection.release
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
    return errorResponse('internal', 500)
  }
}
