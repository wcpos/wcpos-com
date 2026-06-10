import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
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

async function DownloadsContent({ locale }: { locale: string }) {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) {
    redirectToLoginClearingSession(locale)
  }

  const now = new Date()
  const releases = await getProPluginReleases()
  const mappedReleases = releases.map((release) => ({
    ...release,
    allowed: isReleaseAllowedForLicenses(release, licenses, now),
  }))

  // Mirrors the entitlement rules in isReleaseAllowedForLicenses so the UI
  // can explain WHY a release is unavailable (expired vs. suspended vs.
  // unverifiable vs. no license). Unknown/suspended licenses never grant
  // access; the extra fields below are messaging-only.
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
  // The banner may only claim "expired" once an expiry has actually passed;
  // e.g. a suspended license can carry a future expiry.
  const expiryHasPassed =
    expiryTimes.length > 0 && Math.max(...expiryTimes) < now.getTime()
  const statuses = licenses.map((license) => license.status.toLowerCase())
  const suspendedCount = statuses.filter(
    (status) => status === 'suspended'
  ).length
  // 'unknown' = placeholder from buildLicensePlaceholder (Keygen unreachable
  // or an unresolvable legacy key); the license may be fine, we just can't
  // verify it right now.
  const unknownCount = statuses.filter((status) => status === 'unknown').length

  return (
    <DownloadsClient
      initialReleases={mappedReleases}
      access={{
        hasActiveLicense,
        latestExpiry,
        expiryHasPassed,
        licenseCount: licenses.length,
        suspendedCount,
        unknownCount,
      }}
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
        <DownloadsContent locale={locale} />
      </Suspense>
    </div>
  )
}
