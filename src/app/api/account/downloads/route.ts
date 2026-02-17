import { NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import {
  getProPluginReleases,
  isReleaseAllowedForLicenses,
} from '@/services/core/business/pro-downloads'

function hasActiveLicense(licenses: Array<{ status: string; expiry: string | null }>): boolean {
  const now = Date.now()
  return licenses.some((license) => {
    if (license.status.toLowerCase() !== 'active') return false
    if (!license.expiry) return true
    return new Date(license.expiry).getTime() >= now
  })
}

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
