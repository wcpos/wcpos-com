import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { verifyDownloadToken } from '@/lib/download-token'
import { isReleaseAllowedForLicenses } from '@/lib/license'
import { findReleaseByVersion } from '@/services/core/business/pro-downloads'
import { getGitHubToken } from '@/services/core/external/github-auth'
import { downloadLogger } from '@/lib/logger'
import { clientIp } from '@/lib/rate-limit'

interface DownloadAttempt {
  name: 'asset-api' | 'asset-browser'
  url: string
  headers: Record<string, string>
}

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

  const release = await findReleaseByVersion(payload.version)
  if (!release) {
    downloadLogger.warn`Download denied: release not found. version=${payload.version} customer=${customer.id} ip=${ip}`
    return NextResponse.json({ error: 'Release not found' }, { status: 404 })
  }

  const { licenses } = await getResolvedCustomerLicenses()
  if (!isReleaseAllowedForLicenses(release, licenses)) {
    downloadLogger.warn`Download denied: not entitled. version=${release.version} customer=${customer.id} ip=${ip}`
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const githubToken = await getGitHubToken()
  if (!githubToken) {
    downloadLogger.warn`GitHub token unavailable for account download. version=${release.version}`
  }

  const downloadAttempts: DownloadAttempt[] = [
    {
      name: 'asset-api',
      url: release.assetApiUrl,
      headers: {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        Accept: 'application/octet-stream',
      },
    },
    {
      name: 'asset-browser',
      url: release.assetUrl,
      headers: {
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        Accept: '*/*',
      },
    },
  ]

  for (const attempt of downloadAttempts) {
    try {
      const response = await fetch(attempt.url, { headers: attempt.headers })
      if (!response.ok || !response.body) {
        downloadLogger.warn`Account download attempt failed (${attempt.name}). status=${response.status} version=${release.version}`
        continue
      }

      // Audit trail: who downloaded what, when, from where. info → Loki only.
      downloadLogger.info`Download served. customer=${customer.id} version=${release.version} asset=${release.assetName} ip=${ip} ua=${userAgent}`

      return new NextResponse(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${release.assetName}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } catch (error) {
      downloadLogger.warn`Account download attempt error (${attempt.name}). version=${release.version} error=${error}`
    }
  }

  // All sources failed for an entitled customer — delivery is broken. error →
  // Discord (download category bypasses the rate limit, never throttled).
  downloadLogger.error`Failed to fetch release asset after retries. version=${release.version} customer=${customer.id} ip=${ip}`
  return NextResponse.json(
    { error: 'Failed to fetch release asset' },
    { status: 502 }
  )
}
