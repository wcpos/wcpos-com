import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer, getCustomerOrders } from '@/lib/medusa-auth'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getExpiringSoonExpiry } from '@/lib/license'
import { formatOrderAmount } from '@/lib/order-display'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { formatDateForLocale } from '@/lib/date-format'
import { Link } from '@/i18n/navigation'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { Key, MessageCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountNotice } from '@/components/account/account-notice'
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
      <h1 className="text-2xl font-bold tracking-tight">
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
        <AccountNotice
          action={
            <Button asChild size="sm">
              <Link href="/pro">{t('renewLicense')}</Link>
            </Button>
          }
        >
          {t('expiresSoonRenew', {
            date: formatDateForLocale(expiringSoonExpiry, locale),
          })}
        </AccountNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="transition-colors hover:border-foreground/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('ordersCardTitle')}
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums tracking-tight">
              {orders.length}
            </div>
            <Link
              href="/account/orders"
              className="mt-1 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              {t('viewAllOrders')}
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-foreground/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('licensesCardTitle')}
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-wcpos-red/10">
              <Key className="h-4 w-4 text-wcpos-red-accent" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums tracking-tight">
              {licenseCount}
            </div>
            <Link
              href="/account/licenses"
              className="mt-1 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
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
                    <input type="hidden" name="return_to" value={`/${locale}/account`} />
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
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border p-3 transition-colors hover:border-foreground/20 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t('orderNumber', { id: order.display_id })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateForLocale(order.created_at, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
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
  // Mirrors the streamed stat cards (same breakpoint, header row with icon
  // chip, text-3xl number) so the shell-to-content swap doesn't reflow.
  return (
    <>
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((card) => (
          <Card key={card}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="mb-2 h-9 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
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
