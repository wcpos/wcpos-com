import { NextRequest, NextResponse } from 'next/server'
import semver from 'semver'
import { licenseClient } from '@/services/core/external/license-client'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import {
  licenceScopeFromValidation,
  selectEntitledRelease,
} from '@/services/core/business/release-delivery'

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
  const scope = licenceScopeFromValidation(licenseStatus)
  const selection = selectEntitledRelease(releases, 'latest', scope)

  if (!selection.ok) {
    return NextResponse.json(
      { error: 'No update is available for this license' },
      { status: 403 }
    )
  }

  const latestAllowedRelease = selection.release
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
