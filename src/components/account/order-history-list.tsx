import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { FileDown, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { getOrderDisplayStatus } from '@/lib/order-status'

export interface OrderHistoryOrder {
  id: string
  display_id: number
  status: string
  payment_status?: string
  currency_code: string
  total: number
  created_at: string
  items: Array<{ id: string }>
}

interface OrderHistoryListProps {
  orders: OrderHistoryOrder[]
  locale: string
}

export function OrderHistoryList({ orders, locale }: OrderHistoryListProps) {
  const t = useTranslations('account.orders')

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('emptyTitle')}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t('emptyDescription')}
          </p>
          <Link
            href="/pro"
            className="mt-3 inline-block text-sm font-medium text-wcpos-red-accent hover:underline"
          >
            {t('browsePro')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="transition-colors hover:border-foreground/20"
        >
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {t('orderNumber', { id: order.display_id })}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {t('dateAndItems', {
                    date: formatDateForLocale(order.created_at, locale),
                    count: order.items.length,
                  })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {formatOrderAmount(order.total, order.currency_code)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getOrderDisplayStatus(order)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/api/account/orders/${order.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('downloadReceiptAria', {
                      id: order.display_id,
                    })}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {t('receiptPdf')}
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
