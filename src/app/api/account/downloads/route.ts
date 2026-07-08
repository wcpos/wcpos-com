import { NextResponse } from 'next/server'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { hasActiveLicense } from '@/lib/license'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import { resolveEntitledReleases } from '@/services/core/business/release-delivery'

export async function GET() {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) {
    return NextResponse.json({ errorCode: 'unauthorized' }, { status: 401 })
  }

  const releases = await getProPluginReleases()
  const data = resolveEntitledReleases(releases, {
    kind: 'account',
    licences: licenses,
  })

  return NextResponse.json(
    {
      releases: data,
      hasActiveLicense: hasActiveLicense(licenses),
    },
    { status: 200 }
  )
}
