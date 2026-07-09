import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { CheckoutClient } from '@/components/pro/checkout-client'
import { getCustomer } from '@/lib/medusa-auth'
import { resolveProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import { getRequestStoreEnvironment } from '@/lib/store-environment'
import { filterPaymentsByBackendProviders } from '@/lib/checkout-payments'
import { getCartPaymentProviderContext } from '@/services/core/external/medusa-client'
import { billingPrefillFromCustomer } from '@/lib/billing-profile'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import {
  getProOfferCatalog,
  resolveProOfferCheckoutSelection,
  type ProOfferCheckoutInput,
} from '@/lib/pro-offer-catalog'

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

export async function CheckoutContent({
  locale,
  searchParamsPromise,
}: {
  locale: string
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>
}) {
  // Checkout is auth- and cart-sensitive. Stop prerendering at this Suspense
  // boundary so the static shell is the skeleton, not an interactive
  // signed-out form that can be served before request cookies are available.
  await connection()

  const searchParams = await searchParamsPromise
  const t = await getTranslations({ locale, namespace: 'pro.checkout' })
  // Signed-out visitors are welcome: the checkout's first step creates the
  // account inline. The cart APIs still require auth server-side.
  // Host-keyed: wcpos.com takes live money, beta.wcpos.com uses the staging
  // backend with test-mode payment providers.
  const [customer, storeEnv, cookieStore] = await Promise.all([
    getCustomer(),
    getRequestStoreEnvironment(),
    cookies(),
  ])

  const selectedVariantId = getSingleSearchParam(searchParams, 'variant')
  const selectedProduct = getSingleSearchParam(searchParams, 'product')
  const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
  const analyticsConfig = getAnalyticsConfig(process.env)
  // Only offer payment methods the backend actually registers — config and
  // backend drift independently (see checkout-payments.ts).
  const [{ offers }, paymentProviderContext, experimentVariant] =
    await Promise.all([
      getProOfferCatalog(undefined, storeEnv, locale),
      getCartPaymentProviderContext(storeEnv),
      distinctId
        ? resolveProCheckoutVariant({
            distinctId,
            analyticsEnabled: analyticsConfig.enabled,
          })
        : Promise.resolve<ProCheckoutVariant>('control'),
    ])
  const checkoutInput: ProOfferCheckoutInput = {
    product: selectedProduct,
    variant: selectedVariantId,
  }
  const selectedOffer = resolveProOfferCheckoutSelection(offers, checkoutInput)
  const selectedFullOffer = selectedOffer
    ? offers.find((offer) => offer.handle === selectedOffer.handle)
    : null
  // Prefill billing from the saved profile (same source receipts read).
  const prefill = customer
    ? billingPrefillFromCustomer(customer)
    : { address: null, taxNumber: undefined }

  return (
    <CheckoutClient
      customerEmail={customer?.email}
      initialBillingAddress={prefill.address}
      initialTaxNumber={prefill.taxNumber}
      selectedOfferHandle={selectedOffer?.handle}
      offerSummary={
        selectedFullOffer
          ? {
              title:
                selectedFullOffer.planId === 'yearly'
                  ? t('offers.yearly')
                  : selectedFullOffer.planId === 'lifetime'
                    ? t('offers.lifetime')
                    : t('offers.default'),
              priceFormatted: selectedFullOffer.price.formatted,
            }
          : undefined
      }
      checkoutPath={buildCheckoutRedirectPath(searchParams)}
      experimentVariant={experimentVariant}
      cartRegionId={paymentProviderContext.cartRegionId ?? undefined}
      payments={filterPaymentsByBackendProviders(
        storeEnv.payments,
        paymentProviderContext.providerIds
      )}
    />
  )
}
