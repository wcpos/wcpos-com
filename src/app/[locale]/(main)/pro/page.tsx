import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { cookies } from 'next/headers'
import { getWcposProProducts } from '@/services/core/external/medusa-client'
import { PricingCard } from '@/components/pro/pricing-card'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { resolveProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return marketingMetadata({
    locale,
    path: '/pro',
    title: 'Pro - Premium Features',
    description:
      'Upgrade WooCommerce POS with Pro: terminal payments, stock and price editing, order and customer management, end-of-day reports, and priority support.',
  })
}

/**
 * Dynamic component that fetches products from Medusa
 */
async function PricingSection({
  experimentVariant,
}: {
  experimentVariant: ProCheckoutVariant
}) {
  'use cache'
  cacheLife('products')
  cacheTag('products')

  const products = await getWcposProProducts()

  // Sort products: yearly first, then lifetime
  const sortedProducts = [...products].sort((a, b) => {
    if (a.handle === 'wcpos-pro-yearly') return -1
    if (b.handle === 'wcpos-pro-yearly') return 1
    return 0
  })

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Pricing information is currently unavailable. Please try again
          later.
        </p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
      {sortedProducts.map((product) => (
        <PricingCard
          key={product.id}
          product={product}
          featured={product.handle === 'wcpos-pro-yearly'}
          experimentVariant={experimentVariant}
        />
      ))}
    </div>
  )
}

function PricingSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

async function PricingSectionWithExperiment() {
  const cookieStore = await cookies()
  const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
  const analyticsConfig = getAnalyticsConfig(process.env)
  const experimentVariant = distinctId
    ? await resolveProCheckoutVariant({
        distinctId,
        analyticsEnabled: analyticsConfig.enabled,
      })
    : 'control'

  return <PricingSection experimentVariant={experimentVariant} />
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'WooCommerce POS Pro',
            description:
              'Premium Point of Sale plugin for WooCommerce. Adds payment terminal integration, stock and price editing, order and customer management, end-of-day reports, custom payment gateways, and priority support.',
            brand: {
              '@type': 'Organization',
              name: 'WCPOS',
            },
            offers: [
              {
                '@type': 'Offer',
                name: 'Yearly Subscription',
                priceCurrency: 'USD',
                price: '129',
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Lifetime License',
                priceCurrency: 'USD',
                price: '249',
                availability: 'https://schema.org/InStock',
              },
            ],
          }),
        }}
      />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          WooCommerce POS Pro
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Everything in the free POS, plus payment terminals, store
          management at the register, end-of-day reports, and priority
          support.
        </p>
      </section>

      {/* Pricing Section - Dynamic */}
      <section className="container mx-auto px-4 pb-16">
        <Suspense fallback={<PricingSkeleton />}>
          <PricingSectionWithExperiment />
        </Suspense>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-4">
          What&apos;s included in Pro?
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
          Everything in Free, plus the tools to run your whole store from the
          register — and priority support when you need a hand.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureBlock
            title="Payment Terminal Integration"
            description="Connect card readers and payment terminals for fast, accurate in-person payments."
          />
          <FeatureBlock
            title="Stock & Price Editing"
            description="Update stock levels, prices, and product details right from the POS — no trip to the WordPress admin."
          />
          <FeatureBlock
            title="Order Management"
            description="Browse order history, open past orders, and manage them without leaving the register."
          />
          <FeatureBlock
            title="Customer Management"
            description="Add and edit customer details at the point of sale, kept in sync with WooCommerce."
          />
          <FeatureBlock
            title="End-of-Day Reports"
            description="Close the register with end-of-day summaries of sales, payments, and takings."
          />
          <FeatureBlock
            title="Custom Payment Gateways"
            description="Take payments with any WooCommerce-compatible gateway, not just the built-in options."
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <FaqItem
            question="Is the free plugin limited?"
            answer="No. The free WooCommerce POS plugin is GPL software with full point of sale features — unlimited products, orders, and customers, and no transaction fees. Pro adds the advanced tools listed above."
          />
          <FaqItem
            question="What's the difference between Yearly and Lifetime?"
            answer="The Yearly subscription renews annually and includes all updates during your subscription period. The Lifetime license is a one-time payment that includes updates forever."
          />
          <FaqItem
            question="Can I upgrade from Yearly to Lifetime?"
            answer="Yes! Contact our support team and we'll credit your remaining subscription towards a Lifetime license."
          />
          <FaqItem
            question="How many sites can I use my license on?"
            answer="Each license can be activated on multiple sites. Check your account dashboard for activation limits."
          />
          <FaqItem
            question="What payment methods do you accept?"
            answer="We accept credit cards (Visa, Mastercard, Amex), PayPal, and Bitcoin."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureBlock({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b pb-6">
      <h3 className="text-lg font-semibold mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  )
}
