import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { LicensesClient } from '@/components/account/licenses-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getImpersonation } from '@/lib/impersonation'
import { getDiscordAccessByLicense } from '@/lib/discord/connected-member-service'
import { getProPluginReleases } from '@/services/core/business/pro-downloads'
import { selectEntitledRelease } from '@/services/core/business/release-delivery'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
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
    title: t('licenses.title'),
    description: t('licenses.description'),
  }
}

function LicensesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Entitlement is decided PER LICENCE, not pooled (ADR-0006). The map attributes
 * a single covered version to each licence: the newest release that licence —
 * on its own — is entitled to download. Computed server-side so we never ship
 * release dates/entitlement logic into the client more than once.
 */
function buildEntitledVersions(
  licenses: LicenseDetail[],
  releases: { version: string; publishedAt: string }[],
  nowMs: number
): Record<string, string | null> {
  const map: Record<string, string | null> = {}
  for (const license of licenses) {
    const selection = selectEntitledRelease(
      releases,
      'latest',
      { kind: 'licence', licence: license },
      nowMs
    )
    map[license.id] = selection.ok ? selection.release.version : null
  }
  return map
}

async function LicensesContent({ locale }: { locale: string }) {
  // Read request data (cookies, via the customer lookup) before touching the
  // current time: under Cache Components a Server Component may only read the
  // clock once an uncached/request data source has been accessed. Mirrors the
  // ordering on the downloads page.
  const { authenticated, licenses } = await getResolvedCustomerLicenses()
  if (!authenticated) {
    redirectToLoginClearingSession(locale)
  }

  const nowMs = new Date().getTime()
  let releases: { version: string; publishedAt: string }[] = []
  try {
    releases = await getProPluginReleases()
  } catch {
    releases = []
  }
  const entitledVersions = buildEntitledVersions(licenses, releases, nowMs)
  const discordAccessByLicense = getDiscordAccessByLicense(licenses)
  // An admin inspecting this account read-only must not be able to start the
  // public Discord claim OAuth flow (it posts outside /api/account, so
  // assertViewOnly() can't fence it) — gate the CTA client-side instead.
  const viewOnly = (await getImpersonation()) !== null

  return (
    <LicensesClient
      initialLicenses={licenses}
      entitledVersions={entitledVersions}
      discordAccessByLicense={discordAccessByLicense}
      viewOnly={viewOnly}
    />
  )
}

export default async function LicensesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.licenses' })

  return (
    <div className="space-y-6">
      <PageHeader title={t('heading')} />
      <Suspense fallback={<LicensesSkeleton />}>
        <LicensesContent locale={locale} />
      </Suspense>
    </div>
  )
}
