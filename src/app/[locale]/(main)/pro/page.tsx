import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { cookies } from 'next/headers'
import { ProBuyBox, type ProBuyBoxOption } from '@/components/pro/pro-buy-box'
import {
  PRO_FEATURE_KEYS,
  ProFeatureList,
} from '@/components/pro/pro-features'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { resolveProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'
import {
  buildProCheckoutHref,
  buildProOfferSchemaOffers,
  getProCheckoutCtaLabel,
  getProOfferCatalog,
} from '@/lib/pro-offer-catalog'
import type { PlanId } from '@/lib/plans'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

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
 * Buy-box copy: one product, two terms. Price + term facts only; the
 * values are resolved through the locale messages in BuyBoxSection.
 */
type BuyBoxMessageKey =
  | 'buyBox.yearly.title'
  | 'buyBox.yearly.subtitle'
  | 'buyBox.yearly.badgeLabel'
  | 'buyBox.yearly.priceSuffix'
  | 'buyBox.yearly.ctaNote'
  | 'buyBox.lifetime.title'
  | 'buyBox.lifetime.subtitle'
  | 'buyBox.lifetime.priceSuffix'
  | 'buyBox.lifetime.ctaNote'

const BUY_BOX_COPY_KEYS = {
  yearly: {
    title: 'buyBox.yearly.title',
    subtitle: 'buyBox.yearly.subtitle',
    badgeLabel: 'buyBox.yearly.badgeLabel',
    priceSuffix: 'buyBox.yearly.priceSuffix',
    ctaNote: 'buyBox.yearly.ctaNote',
  },
  lifetime: {
    title: 'buyBox.lifetime.title',
    subtitle: 'buyBox.lifetime.subtitle',
    badgeLabel: null,
    priceSuffix: 'buyBox.lifetime.priceSuffix',
    ctaNote: 'buyBox.lifetime.ctaNote',
  },
} as const satisfies Record<
  PlanId,
  {
    title: BuyBoxMessageKey
    subtitle: BuyBoxMessageKey
    badgeLabel: BuyBoxMessageKey | null
    priceSuffix: BuyBoxMessageKey
    ctaNote: BuyBoxMessageKey
  }
>

/**
 * Dynamic component that fetches offers from Medusa. Only this box
 * suspends; the rest of the page renders statically.
 */
export async function BuyBoxSection({
  experimentVariant,
  locale,
}: {
  experimentVariant: ProCheckoutVariant
  locale: string
}) {
  'use cache'
  cacheLife('products')
  cacheTag('products')

  const t = await getTranslations({ locale, namespace: 'pro' })
  const { offers } = await getProOfferCatalog()

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-muted-foreground">
          Pricing information is currently unavailable. Please try again
          later.
        </p>
      </div>
    )
  }

  const options: ProBuyBoxOption[] = offers.map((offer) => {
    const copy = BUY_BOX_COPY_KEYS[offer.planId]
    return {
      planId: offer.planId,
      handle: offer.handle,
      title: t(copy.title),
      subtitle: t(copy.subtitle),
      badgeLabel: copy.badgeLabel ? t(copy.badgeLabel) : null,
      priceText: offer.price.compact,
      priceSuffix: t(copy.priceSuffix),
      ctaNote: t(copy.ctaNote),
      checkoutHref: buildProCheckoutHref(offer, experimentVariant),
    }
  })

  return (
    <ProBuyBox
      options={options}
      ctaLabel={getProCheckoutCtaLabel(experimentVariant)}
      experimentVariant={experimentVariant}
    />
  )
}

function BuyBoxSkeleton() {
  return (
    <div
      data-testid="pro-buy-box-skeleton"
      className="space-y-4 rounded-2xl border bg-card p-6"
    >
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-11" />
    </div>
  )
}

async function BuyBoxWithExperiment({ locale }: { locale: string }) {
  const cookieStore = await cookies()
  const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
  const analyticsConfig = getAnalyticsConfig(process.env)
  const experimentVariant = distinctId
    ? await resolveProCheckoutVariant({
        distinctId,
        analyticsEnabled: analyticsConfig.enabled,
      })
    : 'control'

  return (
    <BuyBoxSection experimentVariant={experimentVariant} locale={locale} />
  )
}

async function ProProductJsonLd() {
  'use cache'
  cacheLife('products')
  cacheTag('products')

  const { offers } = await getProOfferCatalog()

  return (
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
          offers: buildProOfferSchemaOffers(offers),
        }),
      }}
    />
  )
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pro' })

  const features = PRO_FEATURE_KEYS.map(({ key, Icon }) => ({
    Icon,
    title: t(`features.${key}.title`),
    description: t(`features.${key}.description`),
  }))

  return (
    <main>
      <Suspense fallback={null}>
        <ProProductJsonLd />
      </Suspense>

      <Section tone="default" spacing="hero">
        <SectionHeading
          as="h1"
          size="hero"
          title="WooCommerce POS Pro"
          subtitle="Everything in the free POS, plus payment terminals, store management at the register, end-of-day reports, and priority support."
        />
      </Section>

      {/* Features render statically; only the buy box waits on Medusa */}
      <Section tone="default" spacing="compact">
        <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
          <ProFeatureList
            heading={t('features.title')}
            subtitle={t('features.subtitle')}
            features={features}
          />
          <div className="lg:sticky lg:top-24">
            <Suspense fallback={<BuyBoxSkeleton />}>
              <BuyBoxWithExperiment locale={locale} />
            </Suspense>
          </div>
        </div>
      </Section>

      {/* FAQ Section */}
      <Section tone="muted" spacing="default">
        <SectionHeading className="mb-12" title={t('faq.title')} />
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
      </Section>
    </main>
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
