import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { LicensesClient } from '@/components/account/licenses-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
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
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function LicensesContent({ locale }: { locale: string }) {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()

  if (!authenticated) {
    redirectToLoginClearingSession(locale)
  }

  return <LicensesClient initialLicenses={licenses} />
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
      <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
      <Suspense fallback={<LicensesSkeleton />}>
        <LicensesContent locale={locale} />
      </Suspense>
    </div>
  )
}
