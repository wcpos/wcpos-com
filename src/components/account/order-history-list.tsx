import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { FileDown, Key, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { getOrderDisplayStatus } from '@/lib/order-status'

/**
 * A licence an order produced, ready for display. The key is ALREADY masked
 * server-side (`****-****-XXXX`) — the raw key never reaches this component, so
 * it is safe to serialize to the client. `product` is the line-item title the
 * licence was issued for; omitted when the order metadata carries no product
 * context.
 */
export interface OrderHistoryLicense {
  maskedKey: string
  product?: string
}

export interface OrderHistoryOrder {
  id: string
  display_id: number
  status: string
  payment_status?: string
  currency_code: string
  total: number
  created_at: string
  items: Array<{ id: string }>
  /**
   * Licences produced by this order, masked server-side. Optional and
   * degrades gracefully: when the orders list endpoint does not project
   * `metadata.licenses`, this is absent and no licence chip is shown.
   */
  licenses?: OrderHistoryLicense[]
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
              <div className="min-w-0 space-y-1">
                {/* Plain text, not a link: the row's "View" action below is
                    the single anchor to the detail page, so no nested
                    anchors and the Receipt button stays a sibling. */}
                <p className="font-medium">
                  {t('orderNumber', { id: order.display_id })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('dateAndItems', {
                    date: formatDateForLocale(order.created_at, locale),
                    count: order.items.length,
                  })}
                </p>
                {order.licenses?.map((license, index) => (
                  <p
                    key={`${license.maskedKey}-${license.product ?? 'license'}-${index}`}
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground"
                  >
                    <Key
                      className="h-3.5 w-3.5 shrink-0 text-wcpos-red-accent"
                      aria-hidden="true"
                    />
                    {license.product && (
                      <span className="font-medium text-foreground">
                        {license.product}
                      </span>
                    )}
                    <code className="font-mono tracking-wider">
                      {license.maskedKey}
                    </code>
                  </p>
                ))}
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
                <div className="flex items-center gap-2">
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
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/account/orders/${order.id}`}
                      aria-label={t('viewOrderAria', { id: order.display_id })}
                    >
                      {t('viewOrder')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
