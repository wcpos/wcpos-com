import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { DownloadsClient } from '@/components/account/downloads-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import {
  getProPluginReleases,
  isReleaseAllowedForLicenses,
} from '@/services/core/business/pro-downloads'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Downloads',
  description: 'Download WCPOS Pro plugin releases for your licenses.',
}

function DownloadsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((row) => (
        <Card key={row}>
          <CardHeader>
            <div className="h-5 w-52 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function DownloadsContent() {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) {
    redirect('/login')
  }

  const now = new Date()
  const releases = await getProPluginReleases()
  const mappedReleases = releases.map((release) => ({
    ...release,
    allowed: isReleaseAllowedForLicenses(release, licenses, now),
  }))

  // Mirrors the entitlement rules in isReleaseAllowedForLicenses so the UI
  // can explain WHY a release is unavailable (expired vs. no license).
  const hasActiveLicense = licenses.some((license) => {
    if (license.status.toLowerCase() !== 'active') return false
    if (!license.expiry) return true
    return new Date(license.expiry).getTime() >= now.getTime()
  })
  const expiryTimes = licenses
    .map((license) =>
      license.expiry ? new Date(license.expiry).getTime() : Number.NaN
    )
    .filter((time) => !Number.isNaN(time))
  const latestExpiry =
    expiryTimes.length > 0
      ? new Date(Math.max(...expiryTimes)).toISOString()
      : null

  return (
    <DownloadsClient
      initialReleases={mappedReleases}
      access={{ hasActiveLicense, latestExpiry, licenseCount: licenses.length }}
    />
  )
}

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Downloads</h1>
      <Suspense fallback={<DownloadsSkeleton />}>
        <DownloadsContent />
      </Suspense>
    </div>
  )
}
