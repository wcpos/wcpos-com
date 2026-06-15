import { getTranslations, setRequestLocale } from 'next-intl/server'
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
import { getPlanByHandle } from '@/lib/plans'

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
    const rankA = getPlanByHandle(a.handle)?.id === 'yearly' ? 0 : 1
    const rankB = getPlanByHandle(b.handle)?.id === 'yearly' ? 0 : 1
    return rankA - rankB
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
          featured={getPlanByHandle(product.handle)?.id === 'yearly'}
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
  const t = await getTranslations({ locale, namespace: 'pro' })

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
          {t('features.title')}
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
          {t('features.subtitle')}
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureBlock
            title={t('features.terminal.title')}
            description={t('features.terminal.description')}
          />
          <FeatureBlock
            title={t('features.stockPrice.title')}
            description={t('features.stockPrice.description')}
          />
          <FeatureBlock
            title={t('features.orders.title')}
            description={t('features.orders.description')}
          />
          <FeatureBlock
            title={t('features.customers.title')}
            description={t('features.customers.description')}
          />
          <FeatureBlock
            title={t('features.reports.title')}
            description={t('features.reports.description')}
          />
          <FeatureBlock
            title={t('features.gateways.title')}
            description={t('features.gateways.description')}
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t('faq.title')}
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <FaqItem
            question={t('faq.freePlugin.question')}
            answer={t('faq.freePlugin.answer')}
          />
          <FaqItem
            question={t('faq.yearlyVsLifetime.question')}
            answer={t('faq.yearlyVsLifetime.answer')}
          />
          <FaqItem
            question={t('faq.upgrade.question')}
            answer={t('faq.upgrade.answer')}
          />
          <FaqItem
            question={t('faq.siteLimits.question')}
            answer={t('faq.siteLimits.answer')}
          />
          <FaqItem
            question={t('faq.paymentMethods.question')}
            answer={t('faq.paymentMethods.answer')}
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
