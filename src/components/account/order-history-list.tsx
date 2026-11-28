import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowRight, FileDown, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { TextLink } from '@/components/ui/text-link'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { receiptDownloadHref } from '@/lib/receipt-download'
import { localizeKnownProductTitle } from '@/lib/product-title-display'
import { presentOrderStatus } from '@/lib/order-status-presentation'
import type { OrderStatusLabels } from '@/lib/order-status'

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
  /** Semantic status register for the status pill; absent/null → neutral. */
  statusKey?: keyof OrderStatusLabels | null
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
  const productTitles = useTranslations('account.productTitles')
  const productTitleMessages = {
    yearly: productTitles('yearly'),
    lifetime: productTitles('lifetime'),
  }

  if (orders.length === 0) {
    return (
      <Card>
        <EmptyState
          className="items-start p-5 text-left"
          icon={<ShoppingBag />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <TextLink asChild className="inline-flex items-center gap-1 text-sm">
              <Link href="/pro">
                {t('browsePro')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </TextLink>
          }
        />
      </Card>
    )
  }

  // Flat, divider-led list (no card): number + status, one meta line, then
  // amount, receipt and the view link in a fixed-width trailing cell so every
  // row's amount and receipt share one edge.
  return (
    <div className="divide-y border-y">
      {orders.map((order) => (
        <div
          key={order.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <div className="min-w-0">
            {/* Plain text, not a link: the row's "View order" action is the
                single anchor to the detail page, so no nested anchors and
                the Receipt button stays a sibling. */}
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {t('orderNumber', { id: order.displayId })}
              <StatusBadge tone={presentOrderStatus(order.statusKey ?? null)}>
                {order.displayStatus}
              </StatusBadge>
            </p>
            {order.legacyDisplayId && (
              <p className="text-[13px] text-muted-foreground">
                {t('legacyOrderNumber', { id: order.legacyDisplayId })}
              </p>
            )}
            <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
              {order.licenses?.length
                ? [
                    formatDateForLocale(order.createdAt, locale),
                    ...order.licenses.flatMap((license) => [
                      license.product &&
                        localizeKnownProductTitle(
                          license.product,
                          productTitleMessages
                        ),
                      license.maskedKey.replace(/\*/g, '•'),
                    ]),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : t('dateAndItems', {
                    date: formatDateForLocale(order.createdAt, locale),
                    count: order.itemCount,
                  })}
            </p>
          </div>
          <p className="text-right font-semibold tabular-nums">
            {formatOrderAmount(
              order.total.amount,
              order.total.currencyCode,
              locale
            )}
          </p>
          <div className="col-span-2 flex items-center gap-4 md:col-span-1">
            <Button asChild variant="outline" size="sm">
              <a
                href={receiptDownloadHref(order.id, locale)}
                target="_blank"
                rel="noreferrer"
                aria-label={t('downloadReceiptAria', {
                  id: order.displayId,
                })}
              >
                <FileDown />
                {t('receiptPdf')}
              </a>
            </Button>
            <span className="min-w-[72px] text-right text-sm">
              <TextLink asChild>
                <Link
                  href={`/account/orders/${order.id}`}
                  aria-label={t('viewOrderAria', { id: order.displayId })}
                >
                  {t('viewOrder')}
                </Link>
              </TextLink>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
