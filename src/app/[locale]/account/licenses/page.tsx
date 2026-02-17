import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LicensesClient } from '@/components/account/licenses-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

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

async function LicensesContent() {
  const { authenticated, licenses } = await getResolvedCustomerLicenses()

  if (!authenticated) {
    redirect('/login')
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Licenses</h1>
      <Suspense fallback={<LicensesSkeleton />}>
        <LicensesContent />
      </Suspense>
    </div>
  )
}
