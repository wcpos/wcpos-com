import { NextRequest, NextResponse } from 'next/server'
import semver from 'semver'
import { licenseClient } from '@/services/core/external/license-client'
import {
  getProPluginReleases,
  isReleaseAllowedForLicenses,
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

function normalizeSemver(version: string): string {
  const normalized = semver.valid(version) ?? semver.valid(semver.coerce(version))
  return normalized ?? '0.0.0'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version: currentVersion } = await params
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
  const latestAllowedRelease = releases.find((release) =>
    isReleaseAllowedForLicenses(release, [license])
  )

  if (!latestAllowedRelease) {
    return NextResponse.json(
      { error: 'No update is available for this license' },
      { status: 403 }
    )
  }

  const hasUpdate = semver.gt(
    normalizeSemver(latestAllowedRelease.version),
    normalizeSemver(currentVersion)
  )

  return NextResponse.json(
    {
      hasUpdate,
      version: latestAllowedRelease.version,
      publishedAt: latestAllowedRelease.publishedAt,
      downloadUrl: `/api/pro/download/${latestAllowedRelease.version}?key=${encodeURIComponent(
        key
      )}&instance=${encodeURIComponent(instance)}`,
    },
    { status: 200 }
  )
}
