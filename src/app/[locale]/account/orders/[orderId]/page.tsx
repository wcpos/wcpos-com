import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Suspense } from 'react'
import { getOrderById } from '@/lib/customer-orders'
import { getResolvedLicensesFromOrders } from '@/lib/customer-licenses'
import { projectAccountOrderDetail } from '@/lib/account-order-projection'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, ArrowRight, FileDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TextLink } from '@/components/ui/text-link'
import { OrderLicenseKey } from '@/components/account/order-license-key'
import { presentLicenseStatus } from '@/lib/license-status-presentation'
import { presentOrderStatus } from '@/lib/order-status-presentation'
import { receiptDownloadHref } from '@/lib/receipt-download'
import { localizeKnownProductTitle } from '@/lib/product-title-display'
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
  params: Promise<{ locale: string; orderId: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'account.meta' })
  return {
    title: t('orderDetail.title'),
    description: t('orderDetail.description'),
  }
}

async function OrderDetailContent({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const { orderId, locale: candidate } = await params
  const locale = resolveLocale(candidate)
  const [t, tReceipt, tStatus, tOrderStatus, tProductTitles, order] = await Promise.all([
    getTranslations({ locale, namespace: 'account.orderDetail' }),
    getTranslations({ locale, namespace: 'account.receiptPdf' }),
    getTranslations({ locale, namespace: 'account.licenseStatus' }),
    getTranslations({ locale, namespace: 'account.orderStatus' }),
    getTranslations({ locale, namespace: 'account.productTitles' }),
    getOrderById(orderId),
  ])

  if (!order) {
    notFound()
  }

  // Resolve the order's licences against Keygen for the status badge. The
  // Account Order projection attributes product labels only for single-item
  // orders and keeps activation-key exposure detail-only. `now` is captured
  // once so the expiry-aware display status is stable across this render.
  // (`new Date()` mirrors the downloads page and sidesteps the react-hooks
  // purity lint that flags `Date.now` directly in render.)
  const now = new Date().getTime()
  const resolvedLicenses = await getResolvedLicensesFromOrders([order])
  const orderDetail = projectAccountOrderDetail(
    order,
    resolvedLicenses,
    now,
    orderStatusLabels(tOrderStatus)
  )
  const productTitleMessages = {
    yearly: tProductTitles('yearly'),
    lifetime: tProductTitles('lifetime'),
  }

  const money = (value: { amount: number; currencyCode: string }) =>
    formatOrderAmount(value.amount, value.currencyCode, locale)
  const label = 'text-sm font-semibold uppercase tracking-wider text-muted-foreground'
  // The key from this order sits with its licence: masked, with Show key /
  // Copy key. Keys no entitlement row claims still render on their own.
  const keyFor = (id: string) =>
    orderDetail.activationKeys.find((activation) => activation.id === id)?.key
  const unclaimedKeys = orderDetail.activationKeys.filter(
    (activation) =>
      !orderDetail.licenseEntitlements.some((license) => license.id === activation.id)
  )
  const manageLink = (
    <TextLink asChild className="inline-flex items-center gap-1 text-sm">
      <Link href="/account/licenses">
        {t('manageLicence')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </TextLink>
  )

  // One receipt-shaped panel, laid out like the PDF it downloads.
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('orderNumber', { id: orderDetail.displayId })}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('receiptLede')}</p>
        </div>
        <Button asChild variant="outline">
          <a
            href={receiptDownloadHref(orderDetail.id, locale)}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown />
            {t('downloadReceipt')}
          </a>
        </Button>
      </div>

      <div className="mt-7 grid gap-6 text-sm leading-relaxed md:grid-cols-2">
        <div>
          <p className={label}>{tReceipt('billedTo')}</p>
          <p className="mt-1.5">{orderDetail.email}</p>
        </div>
        <div>
          <p className={label}>{tReceipt('details')}</p>
          <p className="mt-1.5">
            {tReceipt('orderDate')}: {formatDateForLocale(orderDetail.createdAt, locale)}
          </p>
          <p className="flex items-center gap-2">
            {t('statusLabel')}:
            <StatusBadge tone={presentOrderStatus(orderDetail.statusKey)}>
              {orderDetail.displayStatus}
            </StatusBadge>
          </p>
          <p>
            {tReceipt('currency')}: {orderDetail.total.currencyCode.toUpperCase()}
          </p>
          {orderDetail.legacyDisplayId && (
            <p>
              {t('legacyOrderLabel')}: #{orderDetail.legacyDisplayId}
            </p>
          )}
        </div>
      </div>

      <table className="mt-7 w-full text-sm">
        <thead>
          <tr className="border-b text-xs font-semibold tracking-wider text-muted-foreground">
            <th className="py-2 text-left font-semibold">{tReceipt('description')}</th>
            <th className="py-2 text-right font-semibold">{tReceipt('quantity')}</th>
            <th className="py-2 text-right font-semibold">{tReceipt('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {orderDetail.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-3.5">
                {localizeKnownProductTitle(item.title, productTitleMessages)}
              </td>
              <td className="py-3.5 text-right tabular-nums">{item.quantity}</td>
              <td className="py-3.5 text-right tabular-nums">{money(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ms-auto mt-3 flex max-w-xs justify-between text-lg font-bold">
        <span>{tReceipt('total')}</span>
        <span className="tabular-nums">{money(orderDetail.total)}</span>
      </div>

      {(orderDetail.licenseEntitlements.length > 0 || unclaimedKeys.length > 0) && (
        <div className="mt-6 space-y-4 border-t pt-5">
          <p className="text-[13px] text-muted-foreground">
            {t('licenseFromOrderTitle')}
          </p>
          {orderDetail.licenseEntitlements.map((license) => {
            const statusPresentation = presentLicenseStatus(license.status)
            const key = keyFor(license.id)
            return (
              <div key={license.id} className="space-y-2">
                {license.product && (
                  <p className="font-medium">
                    {localizeKnownProductTitle(license.product, productTitleMessages)}
                  </p>
                )}
                {key ? (
                  <OrderLicenseKey licenseKey={key} />
                ) : (
                  <code className="font-mono text-sm">
                    {license.maskedKey.replace(/\*/g, '•')}
                  </code>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Status text stays lowercase to honour the e2e contract. */}
                  <StatusBadge tone={statusPresentation.tone}>
                    {tStatus(statusPresentation.labelKey)}
                  </StatusBadge>
                  {manageLink}
                </div>
              </div>
            )
          })}
          {unclaimedKeys.map((activation) => (
            <div key={activation.id ?? activation.key} className="space-y-2">
              <OrderLicenseKey licenseKey={activation.key} />
              {manageLink}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function OrderDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.orderDetail' })

  return (
    <div className="space-y-6">
      {/* Suspense is required: the locale-aware Link reads the pathname,
          which is dynamic on this route's fallback shell ([orderId] is not
          known at build time under cacheComponents/PPR). */}
      <Suspense fallback={<Skeleton className="h-5 w-32" />}>
        <Link
          href="/account/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToOrders')}
        </Link>
      </Suspense>

      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailContent params={params} />
      </Suspense>
    </div>
  )
}
