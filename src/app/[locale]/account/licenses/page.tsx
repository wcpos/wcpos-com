import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { LicensesClient } from '@/components/account/licenses-client'

function LicensesSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
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
        <LicensesClient />
      </Suspense>
    </div>
  )
}
