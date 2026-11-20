import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { AlertCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ProBuyBox } from '@/components/pro/pro-buy-box'
import { ProBuyBoxFooter } from '@/components/pro/pro-buy-box-footer'
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
import { getRequestStoreEnvironment } from '@/lib/store-environment'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'
import { getProCheckoutCtaLabel } from '@/lib/pro-offer-catalog'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { getCachedProOfferCatalog } from './pro-offer-data'
import { ProProductJsonLd } from './pro-product-json-ld'
import type { Locale } from '@/i18n/config'

const PRO_MESSAGE_NAMESPACE = 'pro'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: PRO_MESSAGE_NAMESPACE })
  return marketingMetadata({
    locale,
    path: '/pro',
    title: t('metadata.title'),
    description: t('metadata.description'),
  })
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
async function BuyBoxWithExperiment({ locale }: { locale: Locale }) {
  const cookieStore = await cookies()
  const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
  const analyticsConfig = getAnalyticsConfig(process.env)
  const experimentVariant = distinctId
    ? await resolveProCheckoutVariant({
        distinctId,
        analyticsEnabled: analyticsConfig.enabled,
      })
    : 'control'

  const storeEnv = await getRequestStoreEnvironment()
  const [t, { offers }] = await Promise.all([
    getTranslations({ locale, namespace: PRO_MESSAGE_NAMESPACE }),
    getCachedProOfferCatalog(storeEnv.name, locale),
  ])
  // next-intl's Translator is key-typed; the options builder takes a plain
  // string-keyed translate function.
  const translate = (key: string, values?: Record<string, string | number>) =>
    t(key as Parameters<typeof t>[0], values)

  // Near-unreachable since the catalog fills missing plans from committed
  // fallback prices — kept as the last line of defense (non-USD catalogs,
  // or the fallback table itself being removed) so the page degrades to a
  // message instead of a crash.
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
      ctaLabel={getProCheckoutCtaLabel(experimentVariant, translate)}
      heading={t('buyBox.heading')}
      subheading={t('buyBox.subheading')}
      termAriaLabel={t('buyBox.termAriaLabel')}
      footer={<ProBuyBoxFooter t={translate} />}
    />
  )
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: PRO_MESSAGE_NAMESPACE })
  const compareT = await getTranslations({ locale, namespace: 'compare' })

  const features = PRO_FEATURE_KEYS.map(({ key, Icon }) => ({
    Icon,
    title: t(`features.${key}.title`),
    description: t(`features.${key}.description`),
    ...(key === 'terminal' && {
      link: { label: t('features.terminal.link'), href: '/extensions' },
    }),
  }))

  return (
    <main>
      <Suspense fallback={null}>
        <ProProductJsonLd locale={locale} />
      </Suspense>

      <Section tone="default" spacing="none" className="pt-10 pb-6 sm:pt-20 sm:pb-8 md:pt-24 md:pb-10 lg:pt-28 lg:pb-10">
        <SectionHeading
          as="h1"
          size="hero"
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />
      </Section>

      {/* Features render statically; only the buy box waits on Medusa */}
      <Section tone="default" spacing="compact" className="pt-4 sm:pt-8 md:pt-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
          <ProFeatureList
            heading={t('features.title')}
            features={features}
          />
          <div
            className="min-w-0 order-first lg:order-none lg:sticky lg:top-24"
            data-testid="pro-buy-box-column"
          >
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
            question={t('faq.expiry.question')}
            answer={t('faq.expiry.answer')}
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
        <p className="mx-auto mt-10 max-w-3xl text-center">
          <TextLink asChild>
            <Link href="/compare">{compareT('hub.hero.title')}</Link>
          </TextLink>
        </p>
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
