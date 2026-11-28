import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Suspense, type ReactNode } from 'react'
import { cookies } from 'next/headers'
import { AlertCircle, ArrowDown, CircleCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ProBuyBox } from '@/components/pro/pro-buy-box'
import { ProBuyBoxFooter } from '@/components/pro/pro-buy-box-footer'
import { ReviewQuote } from '@/components/home/review-quote'
import { buildProBuyBoxOptions } from '@/components/pro/pro-buy-box-options'
import {
  PRO_FEATURE_KEYS,
  ProFeatureList,
} from '@/components/pro/pro-features'
import { ProYearLine } from '@/components/pro/pro-year-line'
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
import { Section, sectionVariants } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { getCachedProOfferCatalog } from './pro-offer-data'
import { ProProductJsonLd } from './pro-product-json-ld'
import type { Locale } from '@/i18n/config'

const PRO_MESSAGE_NAMESPACE = 'pro'
const FEATURES_ANCHOR = 'what-pro-adds'
// Below lg the hero's wrappers dissolve (`contents`) so its blocks interleave
// with the features in the phone order; each block then carries the gutter.
const PHONE_GUTTER = 'px-4 lg:px-0'

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

  const bold = (chunks: ReactNode) => <b>{chunks}</b>

  return (
    <main>
      <Suspense fallback={null}>
        <ProProductJsonLd locale={locale} />
      </Suspense>

      {/*
        Desktop: the buy box sits in the hero beside the H1, with the year
        line, the free-POS note and the review in the left column; the
        features follow. Phone: H1 → buy box → year line → features →
        review → free-POS note, ordered with `order-*` on one flex column.
      */}
      <div
        className={`${sectionVariants({ tone: 'default', spacing: 'none' })} flex flex-col lg:block`}
      >
        <section className="contents lg:block lg:pt-18 lg:pb-6">
          <div className="contents lg:container lg:mx-auto lg:block lg:px-4">
            <div className="contents lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-18">
              <div className="contents lg:block">
                <div className={`order-1 pt-7 lg:pt-0 ${PHONE_GUTTER}`}>
                  <SectionHeading
                    as="h1"
                    size="hero"
                    align="left"
                    className="max-w-160 space-y-4 lg:space-y-5"
                    title={t('hero.title')}
                    subtitle={t('hero.subtitle')}
                  />
                  <p className="mt-3 text-sm lg:hidden">
                    <TextLink
                      href={`#${FEATURES_ANCHOR}`}
                      className="inline-flex items-center gap-1"
                    >
                      {t('hero.jumpLink')}
                      <ArrowDown className="size-4" aria-hidden />
                    </TextLink>
                  </p>
                </div>
                <ProYearLine
                  className={`order-3 max-w-160 pt-8 lg:mt-12 lg:pt-0 ${PHONE_GUTTER}`}
                  title={t('yearLine.title')}
                  today={{
                    label: t('yearLine.today.label'),
                    body: t('yearLine.today.body'),
                  }}
                  year={{
                    label: t('yearLine.year.label'),
                    body: t('yearLine.year.body'),
                  }}
                  after={{
                    label: t('yearLine.after.label'),
                    body: t('yearLine.after.body'),
                  }}
                  short={[
                    t.rich('yearLine.short.today', { b: bold }),
                    t.rich('yearLine.short.year', { b: bold }),
                    t.rich('yearLine.short.after', { b: bold }),
                  ]}
                />
                <div className="order-6 mx-4 mt-8 mb-14 flex max-w-160 gap-3 border-t pt-6 lg:mx-0 lg:mt-10 lg:mb-0">
                  <CircleCheck
                    className="mt-[3px] size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="text-sm">
                    <p className="font-semibold">{t('freePos.title')}</p>
                    <p className="text-muted-foreground">{t('freePos.body')}</p>
                  </div>
                </div>
                <div className={`order-5 pt-10 ${PHONE_GUTTER}`}>
                  <ReviewQuote className="lg:mx-0 lg:max-w-140 lg:text-left" />
                </div>
              </div>
              <div
                className={`order-2 min-w-0 pt-5 lg:pt-0 ${PHONE_GUTTER}`}
                data-testid="pro-buy-box-column"
              >
                <Suspense fallback={<BuyBoxSkeleton />}>
                  <BuyBoxWithExperiment locale={locale} />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Features render statically; only the buy box waits on Medusa */}
        <Section
          id={FEATURES_ANCHOR}
          tone="none"
          spacing="none"
          className="order-4 pt-10 lg:pt-6 lg:pb-24"
        >
          <div className="mx-auto max-w-6xl">
            <ProFeatureList
              heading={t('features.title')}
              features={features}
            />
          </div>
        </Section>
      </div>

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
