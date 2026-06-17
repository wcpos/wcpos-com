import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getOrderById } from '@/lib/customer-orders'
import { getResolvedLicensesFromOrders } from '@/lib/customer-licenses'
import { projectAccountOrderDetail } from '@/lib/account-order-projection'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, FileDown, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DividedList, Row } from '@/components/ui/row'
import type { CanonicalLicenseStatus } from '@/lib/license-status'
import type { Metadata } from 'next'

// Maps a canonical licence status to a shared Badge variant: green = entitled,
// amber/warning = natural lapse (still entitled to pre-expiry releases), red =
// withdrawn by us, secondary = unverifiable.
const LICENSE_BADGE_VARIANT: Record<
  CanonicalLicenseStatus,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  active: 'success',
  expired: 'warning',
  suspended: 'destructive',
  revoked: 'destructive',
  unknown: 'secondary',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}): Promise<Metadata> {
  const { locale } = await params
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
  const { orderId, locale } = await params
  const [t, tStatus, order] = await Promise.all([
    getTranslations({ locale, namespace: 'account.orderDetail' }),
    getTranslations({ locale, namespace: 'account.licenseStatus' }),
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
  const orderDetail = projectAccountOrderDetail(order, resolvedLicenses, now)

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">
        {t('orderNumber', { id: orderDetail.displayId })}
      </h1>

      <div>
        <Button asChild variant="outline" size="sm">
          <a
            href={`/api/account/orders/${orderDetail.id}/receipt`}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown className="mr-2 h-4 w-4" />
            {t('downloadReceipt')}
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('detailsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('dateLabel')}</span>
              <span>{formatDateForLocale(orderDetail.createdAt, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('statusLabel')}</span>
              <span>{orderDetail.displayStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('emailLabel')}</span>
              <span>{orderDetail.email}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>{t('totalLabel')}</span>
              <span>
                {formatOrderAmount(
                  orderDetail.total.amount,
                  orderDetail.total.currencyCode
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('itemsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderDetail.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('quantity', { count: item.quantity })}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatOrderAmount(
                      item.total.amount,
                      item.total.currencyCode
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {orderDetail.licenseEntitlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('licenseFromOrderTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DividedList>
              {orderDetail.licenseEntitlements.map((license) => (
                <Row key={license.id} className="gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-wcpos-red/10 text-wcpos-red-accent"
                    >
                      <Key className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      {license.product && (
                        <p className="truncate font-medium">
                          {license.product}
                        </p>
                      )}
                      <code className="font-mono text-sm tracking-wider text-muted-foreground">
                        {license.maskedKey}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Status text stays lowercase to honour the e2e badge
                        contract; the colour carries the emphasis. */}
                    <Badge variant={LICENSE_BADGE_VARIANT[license.status]}>
                      {tStatus(license.status)}
                    </Badge>
                    <Link
                      href="/account/licenses"
                      className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {t('manageLicence')}
                    </Link>
                  </div>
                </Row>
              ))}
            </DividedList>
          </CardContent>
        </Card>
      )}

      {orderDetail.activationKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('licenseKeysTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DividedList>
              {orderDetail.activationKeys.map((lic) => (
                <Row key={lic.id ?? lic.key} className="gap-2">
                  {/* The full key is intentionally shown here: the order page
                      is where customers retrieve it for plugin activation. */}
                  <code className="break-all font-mono text-sm tracking-wide">
                    {lic.key}
                  </code>
                  <Link
                    href="/account/licenses"
                    className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t('manage')}
                  </Link>
                </Row>
              ))}
            </DividedList>
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.orderDetail' })

  return (
    <div className="space-y-6">
      {/* Suspense is required: the locale-aware Link reads the pathname,
          which is dynamic on this route's fallback shell ([orderId] is not
          known at build time under cacheComponents/PPR). */}
      <Suspense
        fallback={<div className="h-5 w-32 animate-pulse rounded bg-muted" />}
      >
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
