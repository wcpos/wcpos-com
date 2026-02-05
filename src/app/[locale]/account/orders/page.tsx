import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomerOrders } from '@/lib/medusa-auth'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

async function OrdersContent() {
  const orders = await getCustomerOrders(50)

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No orders yet.</p>
          <Link href="/pro" className="text-primary hover:underline mt-2 inline-block">
            Browse WooCommerce POS Pro
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="block"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order #{order.display_id}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} — {order.items.length} item{order.items.length !== 1 ? 's' : ''}
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
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2 text-right">
                <div className="h-5 w-20 bg-muted rounded animate-pulse ml-auto" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order History</h1>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent />
      </Suspense>
    </div>
  )
}
