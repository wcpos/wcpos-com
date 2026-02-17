import { NextRequest, NextResponse } from 'next/server'
import { licenseClient } from '@/services/core/external/license-client'
import { getGitHubToken } from '@/services/core/external/github-auth'
import {
  getProPluginReleases,
  isReleaseAllowedForLicenses,
  normalizeReleaseVersion,
} from '@/services/core/business/pro-downloads'
import type { LicenseDetail } from '@/types/license'

function mapLicenseStatusToDetail(
  key: string,
  status: {
    status: 'active' | 'expired' | 'inactive' | 'invalid'
    expiresAt?: string
    activationsLimit?: number
  }
): LicenseDetail {
  return {
    id: 'validated',
    key,
    status: status.status,
    expiry: status.expiresAt ?? null,
    maxMachines: status.activationsLimit ?? 0,
    machines: [],
    metadata: {},
    policyId: 'validated',
    createdAt: new Date().toISOString(),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params
  const key = request.nextUrl.searchParams.get('key')
  const instance =
    request.nextUrl.searchParams.get('instance') ??
    request.nextUrl.searchParams.get('instanceID')

  if (!key || !instance) {
    return NextResponse.json(
      { error: 'Missing required parameters: key and instance' },
      { status: 400 }
    )
  }

  const licenseStatus = await licenseClient.validateLicense(key, instance)
  if (licenseStatus.status !== 200 || !licenseStatus.data) {
    return NextResponse.json(
      { error: licenseStatus.error || 'License validation failed' },
      { status: licenseStatus.status || 400 }
    )
  }

  const releases = await getProPluginReleases()
  const license = mapLicenseStatusToDetail(key, licenseStatus.data)
  const allowedReleases = releases.filter((release) =>
    isReleaseAllowedForLicenses(release, [license])
  )

  const normalizedVersion = normalizeReleaseVersion(version)
  const selectedRelease =
    normalizedVersion === 'latest'
      ? allowedReleases[0]
      : allowedReleases.find(
          (release) => release.version === normalizedVersion
        )

  if (!selectedRelease) {
    return NextResponse.json(
      { error: 'Requested version is not available for this license' },
      { status: 403 }
    )
  }

  const githubToken = await getGitHubToken()
  const headers: Record<string, string> = {
    Accept: 'application/octet-stream',
  }
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`
  }

  const assetResponse = await fetch(selectedRelease.assetUrl, { headers })
  if (!assetResponse.ok || !assetResponse.body) {
    return NextResponse.json(
      { error: 'Failed to fetch release asset' },
      { status: 502 }
    )
  }

  return new NextResponse(assetResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${selectedRelease.assetName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
