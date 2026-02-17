import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { getAuthToken, getCustomer } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { createDownloadToken } from '@/lib/download-token'
import {
  findReleaseByVersion,
  isReleaseAllowedForLicenses,
} from '@/services/core/business/pro-downloads'

const TOKEN_TTL_MS = 60_000

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const version = typeof body.version === 'string' ? body.version : 'latest'

  const release = await findReleaseByVersion(version)
  if (!release) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 })
  }

  const { licenses } = await getResolvedCustomerLicenses()
  if (!isReleaseAllowedForLicenses(release, licenses)) {
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

  return NextResponse.json({
    downloadUrl: `/api/account/download?token=${encodeURIComponent(token)}`,
    version: release.version,
  })
}
