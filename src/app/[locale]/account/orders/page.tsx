import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getOrdersPage, type MedusaOrder } from '@/lib/customer-orders'
import { extractLicenseReferencesFromOrders } from '@/lib/licenses'
import { maskLicenseKey } from '@/lib/order-display'
import { Link } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  OrderHistoryList,
  type OrderHistoryOrder,
} from '@/components/account/order-history-list'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.meta' })
  return {
    title: t('orders.title'),
    description: t('orders.description'),
  }
}

/**
 * Maps a Medusa order to the client-safe row shape. License keys are masked
 * HERE, server-side, so the raw key is never serialized to the client. The
 * product label is the order's first line-item title (the licence is issued
 * for the purchased plan). When the orders list endpoint does not project
 * `metadata.licenses`, `extractLicenseReferencesFromOrders` returns nothing
 * and the row degrades gracefully to no licence chip.
 */
function toOrderHistoryOrder(order: MedusaOrder): OrderHistoryOrder {
  const product = order.items[0]?.title?.trim() || undefined
  const references = extractLicenseReferencesFromOrders([order]).filter(
    (reference): reference is { id?: string; key: string } =>
      Boolean(reference.key)
  )
  // A licence reference can surface from both order.metadata and item.metadata;
  // dedupe by id (else key) so one entitlement renders a single chip.
  const uniqueReferences = Array.from(
    new Map(
      references.map((reference) => [
        reference.id ? `id:${reference.id}` : `key:${reference.key}`,
        reference,
      ])
    ).values()
  )
  const licenses = uniqueReferences.map((reference) => ({
    maskedKey: maskLicenseKey(reference.key),
    product,
  }))

  return {
    id: order.id,
    display_id: order.display_id,
    status: order.status,
    payment_status: order.payment_status,
    currency_code: order.currency_code,
    total: order.total,
    created_at: order.created_at,
    items: order.items.map((item) => ({ id: item.id })),
    ...(licenses.length > 0 ? { licenses } : {}),
  }
}

async function OrdersContent({ locale }: { locale: string }) {
  const orders = await getOrdersPage(50)

  return (
    <OrderHistoryList orders={orders.map(toOrderHistoryOrder)} locale={locale} />
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
  const t = await getTranslations({ locale, namespace: 'account.orders' })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">
          {t.rich('intro', {
            profileLink: (chunks) => (
              <Link
                href="/account/profile#billing-address"
                className="text-primary hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent locale={locale} />
      </Suspense>
    </div>
  )
}
