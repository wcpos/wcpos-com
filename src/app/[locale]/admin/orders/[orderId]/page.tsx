import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-auth'
import {
  medusaAdminClient,
  type AdminOrderDetail,
} from '@/services/core/external/medusa-admin-client'
import { extractLicenseReferencesFromOrders } from '@/lib/licenses'
import { maskLicenseKey } from '@/lib/license-display'
import { formatOrderAmount } from '@/lib/order-display'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { formatDateForLocale } from '@/lib/date-format'
import {
  MedusaAdminUnconfiguredCard,
  StateCard,
} from '@/components/admin/state-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function OrderDetailContent({ order }: { order: AdminOrderDetail }) {
  // License references live in order/item metadata. Keys are MASKED before
  // rendering — the admin order page never shows a full license key.
  const licenseReferences = extractLicenseReferencesFromOrders([order])

  return (
    <>
      <h1 className="text-2xl font-bold">
        Order #{order.displayId ?? order.id}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>
                {order.createdAt
                  ? formatDateForLocale(order.createdAt, 'en')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>
                {getOrderDisplayStatus({
                  status: order.status,
                  payment_status: order.paymentStatus ?? undefined,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{order.email ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              {order.customerId ? (
                <Link
                  href={`/admin/customers/${order.customerId}`}
                  className="text-primary hover:underline"
                >
                  View customer
                </Link>
              ) : (
                <span>—</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                {order.subtotal !== null
                  ? formatOrderAmount(order.subtotal, order.currencyCode)
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>
                {order.taxTotal !== null
                  ? formatOrderAmount(order.taxTotal, order.currencyCode)
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total</span>
              <span>{formatOrderAmount(order.total, order.currencyCode)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items.</p>
          ) : (
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground">
                      Qty: {item.quantity}
                      {item.unitPrice !== null &&
                        ` · ${formatOrderAmount(item.unitPrice, order.currencyCode)} each`}
                    </p>
                  </div>
                  <p className="font-medium">
                    {item.total !== null
                      ? formatOrderAmount(item.total, order.currencyCode)
                      : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {licenseReferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">License keys</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {licenseReferences.map((reference, index) => (
                <li
                  key={reference.id ?? reference.key ?? index}
                  className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm"
                >
                  {/* Masked server-side; raw keys never leave the server. */}
                  <code className="font-mono">
                    {reference.key ? maskLicenseKey(reference.key) : '—'}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {reference.id ?? 'No license id'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const { locale, orderId } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const result = await medusaAdminClient.getOrderById(orderId)

  if (result.status === 'not_found') {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to orders
      </Link>

      {result.status === 'unconfigured' && <MedusaAdminUnconfiguredCard />}

      {result.status === 'error' && (
        <StateCard title="Failed to load order" detail={result.message} />
      )}

      {result.status === 'ok' && <OrderDetailContent order={result.item} />}
    </div>
  )
}
