import { setRequestLocale } from 'next-intl/server'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { redirect } from '@/i18n/navigation'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { RenewClient } from '@/components/account/renew-client'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { getCustomer } from '@/lib/medusa-auth'
import { billingPrefillFromCustomer } from '@/lib/billing-profile'
import { getRequestStoreEnvironment } from '@/lib/store-environment'
import { getCartPaymentProviderContext } from '@/services/core/external/medusa-client'
import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getProOfferCatalog } from '@/lib/pro-offer-catalog'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Renew your licence',
  robots: { index: false, follow: false },
}

const YEARLY_HANDLE = 'wcpos-pro-yearly'

async function RenewContent({ locale }: { locale: string }) {
  // Auth- and cart-sensitive: stop prerendering here so the shell is the
  // skeleton, and request cookies are available for the customer lookup.
  await connection()

  const customer = await getCustomer()
  if (!customer) {
    redirect({ href: '/account/licenses', locale })
    return null
  }

  const { licenses } = await getResolvedCustomerLicenses()
  // Renewable = has an expiry to extend (lifetime licences never expire).
  // Matches the licenses page's own isRenewable rule.
  const hasRenewable = licenses.some((license) => license.expiry != null)
  if (!hasRenewable) {
    // Nothing to renew (e.g. lifetime-only) — send them back.
    redirect({ href: '/account/licenses', locale })
    return null
  }

  // One-click renewal needs billing on file. Without it, fall back to the full
  // checkout, which collects it.
  const prefill = billingPrefillFromCustomer(customer)
  if (!prefill.address) {
    redirect({ href: `/pro/checkout?product=${YEARLY_HANDLE}`, locale })
    return null
  }

  const storeEnv = await getRequestStoreEnvironment()
  const [{ offers }, paymentContext] = await Promise.all([
    getProOfferCatalog(undefined, storeEnv),
    getCartPaymentProviderContext(storeEnv),
  ])
  const yearly = offers.find((offer) => offer.handle === YEARLY_HANDLE)
  if (!yearly) {
    redirect({ href: `/pro/checkout?product=${YEARLY_HANDLE}`, locale })
    return null
  }

  return (
    <RenewClient
      regionId={paymentContext.cartRegionId ?? undefined}
      offerHandle={YEARLY_HANDLE}
      billingAddress={prefill.address}
      taxNumber={prefill.taxNumber}
      amount={yearly.price.amount}
      currency={yearly.price.currencyCode}
      priceFormatted={yearly.price.formatted}
      productTitle="WCPOS Pro — Yearly"
      stripePublishableKey={storeEnv.payments.stripePublishableKey}
    />
  )
}

export default async function RenewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="space-y-6">
      <Link
        href="/account/licenses"
        prefetch={false}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to licences
      </Link>
      <PageHeader title="Renew your licence" />
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <RenewContent locale={locale} />
      </Suspense>
    </div>
  )
}
