import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { FileDown, Key, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DividedList, Row } from '@/components/ui/row'
import { EmptyState } from '@/components/ui/empty-state'
import { CodeRef } from '@/components/ui/code-ref'
import { TextLink } from '@/components/ui/text-link'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'

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
  displayId: number
  legacyDisplayId?: number
  createdAt: string
  itemCount: number
  displayStatus: string
  total: {
    amount: number
    currencyCode: string
  }
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
        <EmptyState
          icon={<ShoppingBag />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <TextLink asChild className="text-sm">
              <Link href="/pro">{t('browsePro')}</Link>
            </TextLink>
          }
        />
      </Card>
    )
  }

  return (
    <Card>
      <DividedList>
        {orders.map((order) => (
          <Row key={order.id} className="gap-4 px-6">
            <div className="min-w-0 space-y-1">
                {/* Plain text, not a link: the row's "View" action below is
                    the single anchor to the detail page, so no nested
                    anchors and the Receipt button stays a sibling. */}
                <p className="font-medium">
                  {t('orderNumber', { id: order.displayId })}
                </p>
                {order.legacyDisplayId && (
                  <p className="text-sm text-muted-foreground">
                    {t('legacyOrderNumber', { id: order.legacyDisplayId })}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('dateAndItems', {
                    date: formatDateForLocale(order.createdAt, locale),
                    count: order.itemCount,
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
                    <CodeRef className="tracking-wider">
                      {license.maskedKey}
                    </CodeRef>
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {formatOrderAmount(
                      order.total.amount,
                      order.total.currencyCode,
                      locale
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.displayStatus}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/api/account/orders/${order.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t('downloadReceiptAria', {
                        id: order.displayId,
                      })}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      {t('receiptPdf')}
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/account/orders/${order.id}`}
                      aria-label={t('viewOrderAria', { id: order.displayId })}
                    >
                      {t('viewOrder')}
                    </Link>
                  </Button>
                </div>
              </div>
          </Row>
        ))}
      </DividedList>
    </Card>
  )
}
