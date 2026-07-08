import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getOrdersPage } from '@/lib/customer-orders'
import { projectAccountOrderListRows } from '@/lib/account-order-projection'
import { Link } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderHistoryList } from '@/components/account/order-history-list'
import type { Metadata } from 'next'
import type { OrderStatusLabels } from '@/lib/order-status'


function orderStatusLabels(t: (key: keyof OrderStatusLabels) => string): OrderStatusLabels {
  return {
    actionRequired: t('actionRequired'),
    authorized: t('authorized'),
    canceled: t('canceled'),
    paid: t('paid'),
    partiallyRefunded: t('partiallyRefunded'),
    pending: t('pending'),
    refunded: t('refunded'),
    unknown: t('unknown'),
  }
}

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

async function OrdersContent({ locale }: { locale: string }) {
  const [orders, tOrderStatus] = await Promise.all([
    getOrdersPage(50),
    getTranslations({ locale, namespace: 'account.orderStatus' }),
  ])

  return (
    <OrderHistoryList
      orders={projectAccountOrderListRows(orders, orderStatusLabels(tOrderStatus))}
      locale={locale}
    />
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
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="ml-auto h-5 w-20" />
                <Skeleton className="ml-auto h-4 w-16" />
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
      <PageHeader
        title={t('heading')}
        lede={t.rich('intro', {
          profileLink: (chunks) => (
            <Link
              href="/account/profile#billing-address"
              className="text-primary hover:underline"
            >
              {chunks}
            </Link>
          ),
        })}
      />
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent locale={locale} />
      </Suspense>
    </div>
  )
}
