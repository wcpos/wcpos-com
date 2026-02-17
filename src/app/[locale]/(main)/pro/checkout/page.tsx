import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { CheckoutClient } from '@/components/pro/checkout-client'
import { getCustomer } from '@/lib/medusa-auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

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
  return <CheckoutClient customerEmail={customer?.email} />
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
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
            </div>
          }
        >
          <CheckoutContent searchParamsPromise={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}
