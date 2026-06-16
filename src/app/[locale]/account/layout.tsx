import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { AccountSidebar } from '@/components/account/account-sidebar'
import { SiteHeader } from '@/components/main/site-header'
import { SiteFooter } from '@/components/main/site-footer'
import type { Metadata } from 'next'

// Account pages are private — keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Auth gate. Reads cookies (dynamic), so it lives inside <Suspense> to keep
// the cacheComponents/PPR shell static. The shared SiteHeader/SiteFooter
// give the account the same chrome as the rest of the site.
async function AccountGate({ locale }: { locale: string }) {
  const customer = await getCustomer()
  if (!customer) {
    return redirectToLoginClearingSession(locale)
  }
  return null
}

function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-50 h-16 w-full border-b bg-background/95 backdrop-blur" />
  )
}

function AccountSidebarSkeleton() {
  return (
    <nav className="overflow-x-auto md:overflow-x-visible">
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
      {/* The shared header reads auth (dynamic); on the account's PPR shell
          it must be deferred behind a boundary, as the old account header
          was. The marketing layout renders it bare because those routes
          don't prerender a dynamic shell around it. */}
      <Suspense fallback={<HeaderSkeleton />}>
        <SiteHeader />
      </Suspense>
      <Suspense fallback={null}>
        <AccountGate locale={locale} />
      </Suspense>
      <div className="container mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:gap-10 md:py-8">
        <aside className="md:w-56 md:flex-none">
          {/* Suspense is required: the locale-aware Link and usePathname read
              the pathname, which is dynamic on fallback shells of dynamic
              routes such as /account/orders/[orderId] (cacheComponents/PPR). */}
          <Suspense fallback={<AccountSidebarSkeleton />}>
            <AccountSidebar />
          </Suspense>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Suspense fallback={<AccountFooterSkeleton />}>
        <SiteFooter />
      </Suspense>
    </div>
  )
}
