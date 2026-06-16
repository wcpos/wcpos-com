import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { DownloadsClient } from '@/components/account/downloads-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import {
  isLicenseActive,
  isReleaseAllowedForLicenses,
  summarizeDownloadAccess,
} from '@/lib/license'
import { getPlanByPolicyId } from '@/lib/plans'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LicenseDetail } from '@/types/license'
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-7 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="space-y-2 border-t py-4 first:border-t-0 first:pt-0"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Plan label of the licence that entitles the latest build. Any active licence
 * grants every release (see isReleaseAllowedForLicenses), so we attribute to an
 * active licence — preferring a lifetime one, then the one expiring latest, so
 * the copy ("Available on your active Yearly licence") names a durable grant.
 * Returns null when no active licence entitles it or the policy is unrecognized.
 */
function resolveEntitlingPlanLabel(
  licenses: LicenseDetail[],
  nowMs: number,
  planLabel: (key: 'planYearly' | 'planLifetime') => string
): string | null {
  const active = licenses.filter((license) => isLicenseActive(license, nowMs))
  if (active.length === 0) return null

  const entitling = [...active].sort((a, b) => {
    // Lifetime (null expiry) is the most durable grant — sort it first.
    if (a.expiry === null && b.expiry !== null) return -1
    if (b.expiry === null && a.expiry !== null) return 1
    const aTime = a.expiry ? new Date(a.expiry).getTime() : 0
    const bTime = b.expiry ? new Date(b.expiry).getTime() : 0
    return bTime - aTime
  })[0]

  const plan = getPlanByPolicyId(entitling.policyId)
  return plan ? planLabel(plan.labelKey) : null
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
  // When a licence is explicitly scoped via ?license=, honour that scope even
  // when it matches nothing — a foreign/stale id must grant no access, not fall
  // back to pooling every licence (ADR-0006). Only an absent scope sees all.
  const downloadLicenses = scopedLicenseId ? scopedLicenses : licenses
  const nowMs = new Date().getTime()
  const releases = await getProPluginReleases()
  const mappedReleases = releases.map((release) => ({
    version: release.version,
    name: release.name,
    releaseNotes: release.releaseNotes,
    publishedAt: release.publishedAt,
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

  // Plan label of the licence backing the latest build, resolved here (the page
  // owns plan lookup; the client never sees policy ids). Translation is done
  // server-side so the client receives a ready-to-render string.
  const planLabels = await getTranslations({
    locale,
    namespace: 'account.licenses',
  })
  const entitlingPlanLabel = resolveEntitlingPlanLabel(
    downloadLicenses,
    nowMs,
    (key) => planLabels(key)
  )

  return (
    <DownloadsClient
      initialReleases={mappedReleases}
      entitlingPlanLabel={entitlingPlanLabel}
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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('subheading')}</p>
      </div>
      <Suspense fallback={<DownloadsSkeleton />}>
        <DownloadsContent
          locale={locale}
          scopedLicenseId={resolvedSearchParams.license}
        />
      </Suspense>
    </div>
  )
}
