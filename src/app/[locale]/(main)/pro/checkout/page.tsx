import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { CheckoutClient } from '@/components/pro/checkout-client'
import { Skeleton } from '@/components/ui/skeleton'
import { getCustomer } from '@/lib/medusa-auth'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { resolveProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import { getRequestStoreEnvironment } from '@/lib/store-environment'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import {
  getProOfferCatalog,
  resolveProOfferCheckoutSelection,
  type ProOfferCheckoutInput,
} from '@/lib/pro-offer-catalog'

export const metadata = {
  title: 'Checkout',
  description: 'Complete your purchase of WCPOS Pro',
  // Auth-gated transactional page — keep out of search engines.
  robots: { index: false, follow: false },
}

function buildCheckoutRedirectPath(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item)
      }
      continue
    }

    if (typeof value === 'string') {
      query.set(key, value)
    }
  }

  const queryString = query.toString()
  return queryString ? `/pro/checkout?${queryString}` : '/pro/checkout'
}

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = searchParams[key]
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

const OFFER_SUMMARY_TITLES: Record<string, string> = {
  yearly: 'WCPOS Pro — Yearly',
  lifetime: 'WCPOS Pro — Lifetime',
}

async function CheckoutContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await searchParamsPromise
  // Signed-out visitors are welcome: the checkout's first step creates the
  // account inline. The cart APIs still require auth server-side.
  const customer = await getCustomer()

  // Host-keyed: wcpos.com takes live money, beta.wcpos.com uses the staging
  // backend with test-mode payment providers.
  const storeEnv = await getRequestStoreEnvironment()

  const selectedVariantId = getSingleSearchParam(searchParams, 'variant')
  const selectedProduct = getSingleSearchParam(searchParams, 'product')
  const { offers } = await getProOfferCatalog(undefined, storeEnv)
  const checkoutInput: ProOfferCheckoutInput = {
    product: selectedProduct,
    variant: selectedVariantId,
  }
  const selectedOffer = resolveProOfferCheckoutSelection(offers, checkoutInput)
  const selectedFullOffer = selectedOffer
    ? offers.find((offer) => offer.handle === selectedOffer.handle)
    : null
  const cookieStore = await cookies()
  const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
  const analyticsConfig = getAnalyticsConfig(process.env)
  const experimentVariant: ProCheckoutVariant = distinctId
    ? await resolveProCheckoutVariant({
        distinctId,
        analyticsEnabled: analyticsConfig.enabled,
      })
    : 'control'

  return (
    <CheckoutClient
      customerEmail={customer?.email}
      selectedOfferHandle={selectedOffer?.handle}
      offerSummary={
        selectedFullOffer
          ? {
              title:
                OFFER_SUMMARY_TITLES[selectedFullOffer.planId] ??
                'WCPOS Pro',
              priceFormatted: selectedFullOffer.price.formatted,
            }
          : undefined
      }
      checkoutPath={buildCheckoutRedirectPath(searchParams)}
      experimentVariant={experimentVariant}
      payments={storeEnv.payments}
    />
  )
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/pro"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to pricing
        </Link>

        <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>

        <Suspense
          fallback={
            // Mirrors the loaded layout: three step rows + sticky summary.
            <div className="mx-auto grid max-w-4xl items-start gap-8 md:grid-cols-[1.6fr_1fr]">
              <div className="space-y-3">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="rounded-md border bg-card p-5">
                    <Skeleton className="h-6 w-40" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 rounded-md border bg-card p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-20" />
              </div>
            </div>
          }
        >
          <CheckoutContent searchParamsPromise={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}
