import { NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { hasActiveLicense, isReleaseAllowedForLicenses } from '@/lib/license'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'

export async function GET() {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const releases = await getProPluginReleases()
  const data = releases.map((release) => ({
    ...release,
    allowed: isReleaseAllowedForLicenses(release, licenses),
  }))

  return NextResponse.json(
    {
      releases: data,
      hasActiveLicense: hasActiveLicense(licenses),
    },
    { status: 200 }
  )
}
