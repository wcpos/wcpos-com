import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getOrdersPage } from '@/lib/customer-orders'
import { projectAccountOrderListRow } from '@/lib/account-order-projection'
import { Link } from '@/i18n/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { OrderHistoryList } from '@/components/account/order-history-list'
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

async function OrdersContent({ locale }: { locale: string }) {
  const orders = await getOrdersPage(50)

  return (
    <OrderHistoryList
      orders={orders.map(projectAccountOrderListRow)}
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
