import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer, getCustomerOrders } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getExpiringSoonExpiry } from '@/lib/license-display'
import { formatOrderAmount } from '@/lib/order-display'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { formatDateForLocale } from '@/lib/date-format'
import { Link } from '@/i18n/navigation'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { ShoppingBag, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account',
  description: 'Overview of your WCPOS account, recent orders, and licenses.',
}

async function AccountOverviewContent({ locale }: { locale: string }) {
  // Resolving licenses (one Keygen resolution pass, shared with the licenses
  // page) lets the overview warn about imminent expiry, and keeps the license
  // count consistent with what /account/licenses actually lists.
  const [customer, orders, { licenses }] = await Promise.all([
    getCustomer(),
    getCustomerOrders(5),
    getResolvedCustomerLicenses(),
  ])

  if (!customer) {
    redirectToLoginClearingSession(locale)
  }

  const licenseCount = licenses.length
  // Yearly licenses renew by manual re-purchase (no auto-billing), so warn
  // before update access lapses.
  const expiringSoonExpiry = getExpiringSoonExpiry(
    licenses,
    new Date().getTime()
  )

  return (
    <>
      <h1 className="text-2xl font-bold">
        Welcome{customer?.first_name ? `, ${customer.first_name}` : ''}
      </h1>

      {expiringSoonExpiry && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            Your license expires on{' '}
            {formatDateForLocale(expiringSoonExpiry, locale)} &mdash; renew to
            keep receiving updates.
          </p>
          <Button asChild size="sm">
            <Link href="/pro">Renew license</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
              View all orders
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenses</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licenseCount}</div>
            <Link href="/account/licenses" className="text-sm text-muted-foreground hover:underline">
              Manage licenses
            </Link>
          </CardContent>
        </Card>
      </div>

      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Order #{order.display_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateForLocale(order.created_at, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatOrderAmount(order.total, order.currency_code)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getOrderDisplayStatus(order)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function AccountOverviewSkeleton() {
  return (
    <>
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <div className="h-8 w-12 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="h-8 w-12 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="space-y-6">
      <Suspense fallback={<AccountOverviewSkeleton />}>
        <AccountOverviewContent locale={locale} />
      </Suspense>
    </div>
  )
}
