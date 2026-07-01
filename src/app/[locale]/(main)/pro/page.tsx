import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { cookies } from 'next/headers'
import { AlertCircle, Bitcoin, CreditCard, Shield } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ProBuyBox } from '@/components/pro/pro-buy-box'
import { buildProBuyBoxOptions } from '@/components/pro/pro-buy-box-options'
import {
  PRO_FEATURE_KEYS,
  ProFeatureList,
} from '@/components/pro/pro-features'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { TextLink } from '@/components/ui/text-link'
import { resolveProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'
import {
  buildProOfferSchemaOffers,
  getProCheckoutCtaLabel,
  getProOfferCatalog,
} from '@/lib/pro-offer-catalog'
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
 * One cached catalog fetch shared by the buy box and the JSON-LD block —
 * the cache key is the catalog itself, not the experiment variant or
 * locale, which are pure string work applied outside the boundary.
 */
async function getCachedProOfferCatalog() {
  'use cache'
  cacheLife('products')
  cacheTag('products')
  return getProOfferCatalog()
}

function BuyBoxSkeleton() {
  return (
    <Card
      elevated
      data-testid="pro-buy-box-skeleton"
      className="space-y-4 p-6"
    >
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-11" />
    </Card>
  )
}

/**
 * The only dynamic region of the page: Medusa prices + the checkout
 * experiment from cookies. Everything else renders statically around it.
 */
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

  const [t, { offers }] = await Promise.all([
    getTranslations({ locale, namespace: 'pro' }),
    getCachedProOfferCatalog(),
  ])
  // next-intl's Translator is key-typed; the options builder takes a plain
  // string-keyed translate function.
  const translate = (key: string, values?: Record<string, string | number>) =>
    t(key as Parameters<typeof t>[0], values)

  if (offers.length === 0) {
    return (
      <Card elevated className="p-6">
        <EmptyState
          tone="caution"
          icon={<AlertCircle />}
          title={t('buyBox.unavailableTitle')}
          description={t('buyBox.unavailableDescription')}
        />
      </Card>
    )
  }

  return (
    <ProBuyBox
      options={buildProBuyBoxOptions(offers, experimentVariant, translate)}
      ctaLabel={getProCheckoutCtaLabel(experimentVariant)}
      heading={t('buyBox.heading')}
      subheading={t('buyBox.subheading')}
      termAriaLabel={t('buyBox.termAriaLabel')}
      footer={
        <>
          <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <TextLink asChild>
                  <Link href="/refunds">{t('buyBox.guaranteeLink')}</Link>
                </TextLink>
                {t('buyBox.guaranteeSuffix')}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex items-center gap-1">
                {t('buyBox.payments')}
                <Bitcoin className="h-4 w-4" aria-hidden />
              </span>
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t('buyBox.proof')}
          </p>
        </>
      }
    />
  )
}

async function ProProductJsonLd() {
  const { offers } = await getCachedProOfferCatalog()

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
