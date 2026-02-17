import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { redirect } from 'next/navigation'
import { AccountHeader } from '@/components/account/account-header'
import { AccountSidebar } from '@/components/account/account-sidebar'
import { SiteFooter } from '@/components/main/site-footer'

async function AccountHeaderWrapper() {
  const customer = await getCustomer()
  if (!customer) {
    redirect('/login')
  }
  return <AccountHeader customer={customer} />
}

function AccountHeaderSkeleton() {
  return (
    <header className="bg-white border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-xl font-bold text-gray-900">WCPOS</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Account</span>
        </div>
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    </header>
  )
}

function AccountFooterSkeleton() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </div>
    </footer>
  )
}

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<AccountHeaderSkeleton />}>
        <AccountHeaderWrapper />
      </Suspense>
      <div className="flex flex-1">
        <aside className="w-64 border-r">
          <AccountSidebar />
        </aside>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Suspense fallback={<AccountFooterSkeleton />}>
        <SiteFooter />
      </Suspense>
    </div>
  )
}
