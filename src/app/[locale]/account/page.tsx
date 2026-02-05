import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer, getCustomerOrders } from '@/lib/medusa-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function AccountOverviewContent() {
  const [customer, orders] = await Promise.all([
    getCustomer(),
    getCustomerOrders(5),
  ])

  if (!customer) {
    redirect('/login')
  }

  const licenseCount = orders.reduce((count, order) => {
    const licenses = order.metadata?.licenses as Array<{ license_id: string }> | undefined
    return count + (licenses?.length || 0)
  }, 0)

  return (
    <>
      <h1 className="text-2xl font-bold">
        Welcome{customer?.first_name ? `, ${customer.first_name}` : ''}
      </h1>

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
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.currency_code,
                      }).format(order.total / 100)}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">{order.status}</p>
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
        <AccountOverviewContent />
      </Suspense>
    </div>
  )
}
