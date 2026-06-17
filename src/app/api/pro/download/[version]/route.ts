import { NextRequest, NextResponse } from 'next/server'
import { licenseClient } from '@/services/core/external/license-client'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import {
  licenceScopeFromValidation,
  selectEntitledRelease,
} from '@/services/core/business/release-delivery'
import { fetchReleaseAsset } from '@/services/core/external/github-asset'
import { apiLogger } from '@/lib/logger'

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
  const scope = licenceScopeFromValidation(licenseStatus)
  const selection = selectEntitledRelease(releases, version, scope)
  // The plugin contract returns 403 for any version this key cannot select —
  // both "unknown version" and "not entitled" collapse to one refusal.
  if (!selection.ok) {
    return NextResponse.json(
      { error: 'Requested version is not available for this license' },
      { status: 403 }
    )
  }

  const served = await fetchReleaseAsset(selection.release)
  if (!served) {
    apiLogger.error`Failed to fetch pro release asset. version=${selection.release.version}`
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
