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
  const headers: Record<string, string> = {
    Accept: 'application/octet-stream',
  }
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`
  }

  const response = await fetch(release.assetUrl, { headers })
  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: 'Failed to fetch release asset' },
      { status: 502 }
    )
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${release.assetName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
