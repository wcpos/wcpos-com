import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { DownloadsClient } from '@/components/account/downloads-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import {
  isReleaseAllowedForLicenses,
  summarizeDownloadAccess,
} from '@/lib/license'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.meta' })
  return {
    title: t('downloads.title'),
    description: t('downloads.description'),
  }
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

async function DownloadsContent({
  locale,
  scopedLicenseId,
}: {
  locale: string
  scopedLicenseId?: string
}) {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) {
    redirectToLoginClearingSession(locale)
  }

  const scopedLicenses = scopedLicenseId
    ? licenses.filter((license) => license.id === scopedLicenseId)
    : []
  const downloadLicenses = scopedLicenses.length > 0 ? scopedLicenses : licenses
  const nowMs = new Date().getTime()
  const releases = await getProPluginReleases()
  const mappedReleases = releases.map((release) => ({
    ...release,
    allowed: isReleaseAllowedForLicenses(release, downloadLicenses, nowMs),
  }))

  // One-pass access diagnosis so the UI can explain WHY a release is
  // unavailable (expired vs. suspended vs. unverifiable vs. no license).
  const {
    hasActiveLicense,
    latestExpiry,
    expiryHasPassed,
    suspendedCount,
    revokedCount,
    unknownCount,
  } = summarizeDownloadAccess(downloadLicenses, nowMs)

  return (
    <DownloadsClient
      initialReleases={mappedReleases}
      access={{
        hasActiveLicense,
        latestExpiry,
        expiryHasPassed,
        licenseCount: downloadLicenses.length,
        suspendedCount,
        revokedCount,
        unknownCount,
      }}
    />
  )
}

export default async function DownloadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ license?: string }>
}) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.downloads' })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
      <Suspense fallback={<DownloadsSkeleton />}>
        <DownloadsContent
          locale={locale}
          scopedLicenseId={resolvedSearchParams.license}
        />
      </Suspense>
    </div>
  )
}
