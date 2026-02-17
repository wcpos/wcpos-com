import { Suspense } from 'react'
import { getCustomerOrderById } from '@/lib/medusa-auth'
import { extractLicenseReferencesFromOrders } from '@/lib/licenses'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

async function OrderDetailContent({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const { orderId, locale } = await params
  const order = await getCustomerOrderById(orderId)

  if (!order) {
    notFound()
  }

  const licenses = extractLicenseReferencesFromOrders([order]).filter(
    (license): license is { id: string; key: string } =>
      Boolean(license.id && license.key)
  )

  return (
    <>
      <h1 className="text-2xl font-bold">Order #{order.display_id}</h1>

      <div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/account/orders/${order.id}/receipt`} target="_blank" rel="noreferrer">
            <FileDown className="mr-2 h-4 w-4" />
            Download tax receipt (PDF)
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDateForLocale(order.created_at, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{getOrderDisplayStatus(order)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{order.email}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total</span>
              <span>{formatOrderAmount(order.total, order.currency_code)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">
                    {formatOrderAmount(item.total, order.currency_code)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {licenses && licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">License Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {licenses.map((lic) => (
                <div key={lic.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <code className="text-sm font-mono">{lic.key}</code>
                  <Link
                    href="/account/licenses"
                    className="text-sm text-primary hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function OrderDetailSkeleton() {
  return (
    <>
      <div className="h-8 w-40 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-5 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to orders
      </Link>

      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailContent params={params} />
      </Suspense>
    </div>
  )
}
