import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Check, Scale, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { CtaSection } from '@/components/home/cta-section'
import { GlanceTable } from '@/components/compare/glance-table'
import { proAddsLinks } from '@/components/compare/pro-adds-links'
import { CompareBreadcrumb } from '@/components/compare/compare-breadcrumb'
import { MoreComparisons } from '@/components/compare/more-comparisons'
import { SourceList } from '@/components/compare/source-list'
import { localeUrl, marketingMetadata } from '@/lib/seo'
import { comparePageJsonLd } from '@/lib/compare-page-json-ld'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

const COMPARE_NAMESPACE = 'compare'

/**
 * Comparison-table row keys. The glance table is the passage AI answer
 * engines extract for "WCPOS vs Square for WooCommerce" queries — keep every cell
 * self-contained (entity names in the header, one fact per cell).
 */
const GLANCE_ROW_KEYS = [
  'orders',
  'catalog',
  'devices',
  'countries',
  'price',
  'cardPayments',
  'fees',
  'offline',
  'multiLocation',
] as const

const LIMIT_KEYS = [
  'orders',
  'delay',
  'location',
  'countries',
  'sku',
  'variations',
] as const

const SQUARE_BETTER_KEYS = [
  'free',
  'tapToPay',
  'offline',
  'hardware',
] as const

const FAQ_KEYS = [
  'orders',
  'free',
  'terminal',
  'offline',
  'locations',
  'expiry',
] as const

/**
 * The Square and WooCommerce pages every Square fact on this page was read
 * from, checked again on 2026-11-18. The URLs are not translated.
 */
const SOURCES = [
  { key: 'pricingAnnouncement', url: 'https://squareup.com/us/en/press/unified-pricing-and-packaging' },
  { key: 'pricing', url: 'https://squareup.com/us/en/point-of-sale/software/pricing' },
  { key: 'fees', url: 'https://squareup.com/us/en/payments/our-fees' },
  { key: 'offline', url: 'https://squareup.com/help/us/en/article/7777-process-card-payments-with-offline-mode' },
  { key: 'tapToPayIphone', url: 'https://squareup.com/help/us/en/article/7786-get-started-with-tap-to-pay-on-iphone' },
  { key: 'tapToPayAndroid', url: 'https://squareup.com/help/us/en/article/7960-get-started-with-tap-to-pay-on-android' },
  { key: 'posApp', url: 'https://squareup.com/help/us/en/article/8458-use-modes-with-square-point-of-sale' },
  { key: 'register', url: 'https://squareup.com/us/en/hardware/register/specs' },
  { key: 'countries', url: 'https://squareup.com/help/us/en/article/5085-accepted-cards' },
  { key: 'wooFaq', url: 'https://woocommerce.com/document/woocommerce-square/faq/' },
  { key: 'wooSetup', url: 'https://woocommerce.com/document/woocommerce-square/setup-and-configuration-of-the-woocommerce-square/' },
  { key: 'wooPayments', url: 'https://woocommerce.com/document/woocommerce-square/payment-settings/' },
  { key: 'wooVariations', url: 'https://woocommerce.com/document/woocommerce-square/sync-settings/sync-product-data-from-square-to-woocommerce/' },
  { key: 'wooSyncInterval', url: 'https://woocommerce.com/document/woocommerce-square/customizing-woocommerce-square-extension/' },
] as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })
  return marketingMetadata({
    locale,
    path: '/compare/square',
    title: t('square.metadata.title'),
    description: t('square.metadata.description'),
  })
}

type Translate = (key: string) => string

function SquareCompareJsonLd({
  locale,
  translate,
}: {
  locale: Locale
  translate: Translate
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_KEYS.map((key) => ({
              '@type': 'Question',
              name: translate(`square.faq.${key}.question`),
              acceptedAnswer: {
                '@type': 'Answer',
                text: translate(`square.faq.${key}.answer`),
              },
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: translate('hub.hero.title'),
                item: localeUrl(locale, '/compare'),
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: translate('square.hero.title'),
                item: localeUrl(locale, '/compare/square'),
              },
            ],
          },
          comparePageJsonLd({
            slug: 'square',
            locale,
            name: translate('square.metadata.title'),
            description: translate('square.metadata.description'),
          }),
        ]),
      }}
    />
  )
}

export default async function SquareComparePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })
  // next-intl's Translator is key-typed; JSON-LD and the key lists above
  // build keys dynamically, so widen to a plain string-keyed function.
  const translate: Translate = (key) => t(key as Parameters<typeof t>[0])

  const glanceRows = GLANCE_ROW_KEYS.map((key) => ({
    label: t(`square.glance.rows.${key}.label`),
    wcpos: t(`square.glance.rows.${key}.wcpos`),
    other: t(`square.glance.rows.${key}.square`),
  }))

  return (
    <main>
      <SquareCompareJsonLd locale={locale} translate={translate} />

      <Section tone="default" spacing="hero" className="pb-6 md:pb-10 lg:pb-12">
        <CompareBreadcrumb
          label={t('breadcrumbLabel')}
          hubLabel={t('hub.hero.title')}
          current={t('square.hero.title')}
        />
        <SectionHeading
          as="h1"
          size="hero"
          className="max-sm:text-left"
          title={t('square.hero.title')}
          subtitle={t('square.hero.subtitle')}
        />
      </Section>

      {/* Answer-first block: the passage AI engines lift for the head query */}
      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.shortAnswer.title')} />
        <p className="mt-4 font-medium">{t('square.shortAnswer.wcpos')}</p>
        <p className="mt-3 text-muted-foreground">
          {t('square.shortAnswer.square')}
        </p>
      </Section>

      <Section tone="default" spacing="none" className="pb-10 md:pb-12" containerClassName="max-w-3xl">
        <Card className="border-l-4 border-l-primary p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Scale className="h-5 w-5 shrink-0" aria-hidden />
            {t('disclosure.title')}
          </h2>
          <p className="text-muted-foreground">{t('disclosure.body')}</p>
        </Card>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-5xl">
        <SectionHeading align="left" title={t('square.glance.title')} />
        <div className="mt-6">
          <GlanceTable
            wcposHeader={t('square.glance.colWcpos')}
            otherHeader={t('square.glance.colSquare')}
            rows={glanceRows}
            caption={t('square.glance.caption')}
          />
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.setup.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('square.setup.square')}</p>
          <p>{t('square.setup.wcpos')}</p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.payments.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('square.payments.square')}</p>
          <p>{t('square.payments.wcpos')}</p>
          <p>{t('square.payments.both')}</p>
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.pricing.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('square.pricing.square')}</p>
          <p>{t('square.pricing.wcpos')}</p>
          <p>{t.rich('square.pricing.proAdds', proAddsLinks)}</p>
          <p>
            {t('square.pricing.demoPrefix')}{' '}
            <a
              href="https://demo.wcpos.com/pos"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t('square.pricing.demoLinkLabel')}
            </a>{' '}
            {t('square.pricing.demoSuffix')}
          </p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.limits.title')} />
        <p className="mt-4 text-muted-foreground">
          {t('square.limits.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {LIMIT_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <X
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`square.limits.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('square.limits.outro')}
        </p>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading
          align="left"
          title={t('square.squareBetter.title')}
        />
        <p className="mt-4 text-muted-foreground">
          {t('square.squareBetter.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {SQUARE_BETTER_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`square.squareBetter.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('square.squareBetter.outro')}
        </p>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.choose.title')} />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(['wcpos', 'square'] as const).map((key) => (
            <Card key={key} elevated className="p-6">
              <h3 className="mb-2 font-semibold">
                {t(`square.choose.${key}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`square.choose.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="default" containerClassName="max-w-3xl">
        <SectionHeading className="mb-10" title={t('square.faq.title')} />
        <div className="space-y-6">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="border-b pb-6">
              <h3 className="mb-2 text-lg font-semibold">
                {t(`square.faq.${key}.question`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`square.faq.${key}.answer`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('square.sources.title')} />
        <p className="mt-4 text-muted-foreground">{t('square.sources.intro')}</p>
        <SourceList items={SOURCES.map(({ key, url }) => ({ key, url, label: t(`square.sources.items.${key}`) }))} />
      </Section>

      <MoreComparisons current="/compare/square" />
      <CtaSection />

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          {t('square.footer.factsDated')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('square.footer.corrections')}
        </p>
      </Section>
    </main>
  )
}
