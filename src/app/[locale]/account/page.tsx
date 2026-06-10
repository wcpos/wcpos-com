import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer, getCustomerOrders } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getExpiringSoonExpiry } from '@/lib/license-display'
import { formatOrderAmount } from '@/lib/order-display'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { formatDateForLocale } from '@/lib/date-format'
import { Link } from '@/i18n/navigation'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { Key, MessageCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'
import { getDiscordLink } from '@/lib/discord/metadata'
import { isDiscordConfigured } from '@/lib/discord/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.meta' })
  return {
    title: t('overview.title'),
    description: t('overview.description'),
  }
}

async function AccountOverviewContent({
  locale,
  discordStatus,
}: {
  locale: string
  discordStatus?: string
}) {
  // Resolving licenses (one Keygen resolution pass, shared with the licenses
  // page) lets the overview warn about imminent expiry, and keeps the license
  // count consistent with what /account/licenses actually lists.
  const [t, customer, orders, { licenses }] = await Promise.all([
    getTranslations({ locale, namespace: 'account.overview' }),
    getCustomer(),
    getCustomerOrders(5),
    getResolvedCustomerLicenses(),
  ])

  if (!customer) {
    redirectToLoginClearingSession(locale)
  }

  const licenseCount = licenses.length
  const discordLink = getDiscordLink(customer.metadata)
  const discordConfigured = isDiscordConfigured()
  // Yearly licenses renew by manual re-purchase (no auto-billing), so warn
  // before update access lapses.
  const expiringSoonExpiry = getExpiringSoonExpiry(
    licenses,
    new Date().getTime()
  )
  const discordStatusKey =
    discordStatus === 'linked' ||
    discordStatus === 'unlinked' ||
    discordStatus === 'synced' ||
    discordStatus === 'join_server' ||
    discordStatus === 'already_linked' ||
    discordStatus === 'error'
      ? discordStatus
      : null

  return (
    <>
      <h1 className="text-2xl font-bold">
        {customer?.first_name
          ? t('welcome', { name: customer.first_name })
          : t('welcomeNoName')}
      </h1>


      {discordStatusKey && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {t(`discordStatus.${discordStatusKey}`)}
        </div>
      )}

      {expiringSoonExpiry && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            {t('expiresSoonRenew', {
              date: formatDateForLocale(expiringSoonExpiry, locale),
            })}
          </p>
          <Button asChild size="sm">
            <Link href="/pro">{t('renewLicense')}</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('ordersCardTitle')}
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
              {t('viewAllOrders')}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('licensesCardTitle')}
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licenseCount}</div>
            <Link href="/account/licenses" className="text-sm text-muted-foreground hover:underline">
              {t('manageLicenses')}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('discordCardTitle')}
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {discordLink ? (
              <>
                <div>
                  <div className="text-lg font-semibold">
                    {discordLink.username ?? t('discordConnectedFallback')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('discordConnectedDescription')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action="/api/discord/resync" method="post">
                    <Button type="submit" size="sm" variant="outline">
                      {t('discordResync')}
                    </Button>
                  </form>
                  <form action="/api/discord/unlink" method="post">
                    <Button type="submit" size="sm" variant="ghost">
                      {t('discordDisconnect')}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('discordDisconnectedDescription')}
                </p>
                {discordConfigured && (
                  <form action="/api/discord/link" method="get">
                    <input type="hidden" name="return_to" value="/account" />
                    <Button type="submit" size="sm">
                      {t('discordConnect')}
                    </Button>
                  </form>
                )}
                {!discordConfigured && (
                  <p className="text-xs text-muted-foreground">
                    {t('discordNotConfigured')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('recentOrders')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      {t('orderNumber', { id: order.display_id })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateForLocale(order.created_at, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatOrderAmount(order.total, order.currency_code)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getOrderDisplayStatus(order)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function AccountOverviewSkeleton() {
  return (
    <>
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <div className="h-8 w-12 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="h-8 w-12 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ discord?: string }>
}) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  setRequestLocale(locale)

  return (
    <div className="space-y-6">
      <Suspense fallback={<AccountOverviewSkeleton />}>
        <AccountOverviewContent locale={locale} discordStatus={resolvedSearchParams.discord} />
      </Suspense>
    </div>
  )
}
