import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { AccountHeader } from '@/components/account/account-header'
import { AccountSidebar } from '@/components/account/account-sidebar'
import { SiteFooter } from '@/components/main/site-footer'
import type { Metadata } from 'next'

// Account pages are private — keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

async function AccountHeaderWrapper({ locale }: { locale: string }) {
  const customer = await getCustomer()
  if (!customer) {
    return redirectToLoginClearingSession(locale)
  }
  return <AccountHeader customer={customer} />
}

function AccountHeaderSkeleton() {
  return (
    <header className="bg-white border-b">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex shrink-0 items-center space-x-2 sm:space-x-4">
          <span className="text-xl font-bold text-gray-900">WCPOS</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Account</span>
        </div>
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200 sm:w-48" />
      </div>
    </header>
  )
}

function AccountSidebarSkeleton() {
  return (
    <nav className="overflow-x-auto p-2 md:overflow-x-visible md:p-4">
      <div className="mb-4 hidden h-4 w-24 animate-pulse rounded bg-muted md:block" />
      <div className="flex w-max items-center gap-1 md:w-auto md:flex-col md:items-stretch md:gap-2">
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="h-11 w-28 animate-pulse rounded-md bg-muted/60 md:h-9 md:w-auto"
          />
        ))}
      </div>
    </nav>
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
        <AccountHeaderWrapper locale={locale} />
      </Suspense>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b md:w-64 md:border-b-0 md:border-r">
          {/* Suspense is required: the locale-aware Link and usePathname read
              the pathname, which is dynamic on fallback shells of dynamic
              routes such as /account/orders/[orderId] (cacheComponents/PPR).
              On static account routes the sidebar still prerenders into the
              shell. */}
          <Suspense fallback={<AccountSidebarSkeleton />}>
            <AccountSidebar />
          </Suspense>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
      <Suspense fallback={<AccountFooterSkeleton />}>
        <SiteFooter />
      </Suspense>
    </div>
  )
}
