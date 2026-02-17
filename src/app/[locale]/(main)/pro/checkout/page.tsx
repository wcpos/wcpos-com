import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { CheckoutClient } from '@/components/pro/checkout-client'
import { getCustomer } from '@/lib/medusa-auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resolveProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

export const metadata = {
  title: 'Checkout',
  description: 'Complete your purchase of WooCommerce POS Pro',
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

async function CheckoutContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await searchParamsPromise
  const customer = await getCustomer()
  if (!customer) {
    const checkoutPath = buildCheckoutRedirectPath(searchParams)
    redirect(`/login?redirect=${encodeURIComponent(checkoutPath)}`)
  }

  const selectedVariantId = getSingleSearchParam(searchParams, 'variant')
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
      selectedVariantId={selectedVariantId}
      experimentVariant={experimentVariant}
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
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              {[1, 2].map((panel) => (
                <div
                  key={panel}
                  className="space-y-3 rounded-xl border bg-card p-6"
                >
                  <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-20 animate-pulse rounded bg-muted" />
                  <div className="h-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          }
        >
          <CheckoutContent searchParamsPromise={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}
