import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getAuthToken, getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { verifyDownloadToken } from '@/lib/download-token'
import {
  findReleaseByVersion,
  isReleaseAllowedForLicenses,
} from '@/services/core/business/pro-downloads'
import { getGitHubToken } from '@/services/core/external/github-auth'
import { licenseLogger } from '@/lib/logger'

interface DownloadAttempt {
  name: 'asset-api' | 'asset-browser'
  url: string
  headers: Record<string, string>
}

export async function GET(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authToken = await getAuthToken()
  const secret = env.DOWNLOAD_TOKEN_SECRET || env.KEYGEN_API_TOKEN || authToken
  if (!secret) {
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

  const githubToken = await getGitHubToken()
  if (!githubToken) {
    licenseLogger.warn`GitHub token unavailable for account download. version=${release.version}`
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
        licenseLogger.warn`Account download attempt failed (${attempt.name}). status=${response.status} version=${release.version}`
        continue
      }

      return new NextResponse(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${release.assetName}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } catch (error) {
      licenseLogger.warn`Account download attempt error (${attempt.name}). version=${release.version} error=${error}`
    }
  }

  licenseLogger.error`Failed to fetch release asset after retries. version=${release.version} customer=${customer.id}`
  return NextResponse.json(
    { error: 'Failed to fetch release asset' },
    { status: 502 }
  )
}
