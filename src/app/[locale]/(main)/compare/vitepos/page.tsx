import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Check, Scale } from 'lucide-react'
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
 * engines extract for "WCPOS vs Vitepos" queries — keep every cell
 * self-contained (entity names in the header, one fact per cell).
 */
const GLANCE_ROW_KEYS = [
  'price',
  'cardPayments',
  'apps',
  'offline',
  'restaurant',
  'display',
  'kiosk',
  'outlets',
  'wporg',
] as const

const VITEPOS_BETTER_KEYS = ['restaurant', 'offline', 'kiosk', 'price', 'rating'] as const

const FAQ_KEYS = ['price', 'offline', 'restaurant', 'apps', 'terminals', 'expiry'] as const

/**
 * The Vitepos pages every Vitepos fact on this page was read from.
 * The URLs are not translated.
 */
const SOURCES = [
  { key: 'pricing', url: 'https://vitepos.com/pricing/' },
  { key: 'home', url: 'https://vitepos.com/' },
  { key: 'features', url: 'https://vitepos.com/features/' },
  { key: 'kiosk', url: 'https://vitepos.com/user-app-or-kiosk/' },
  { key: 'blog', url: 'https://vitepos.com/pos-cash-register/' },
  { key: 'wporg', url: 'https://wordpress.org/plugins/vitepos-lite/' },
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
    path: '/compare/vitepos',
    title: t('vitepos.metadata.title'),
    description: t('vitepos.metadata.description'),
  })
}

type Translate = (key: string) => string

function ViteposCompareJsonLd({
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
              name: translate(`vitepos.faq.${key}.question`),
              acceptedAnswer: {
                '@type': 'Answer',
                text: translate(`vitepos.faq.${key}.answer`),
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
                name: translate('vitepos.hero.title'),
                item: localeUrl(locale, '/compare/vitepos'),
              },
            ],
          },
          comparePageJsonLd({
            slug: 'vitepos',
            locale,
            name: translate('vitepos.metadata.title'),
            description: translate('vitepos.metadata.description'),
          }),
        ]),
      }}
    />
  )
}

export default async function ViteposComparePage({
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
    label: t(`vitepos.glance.rows.${key}.label`),
    wcpos: t(`vitepos.glance.rows.${key}.wcpos`),
    other: t(`vitepos.glance.rows.${key}.vitepos`),
  }))

  return (
    <main>
      <ViteposCompareJsonLd locale={locale} translate={translate} />

      <Section tone="default" spacing="hero" className="pb-6 md:pb-10 lg:pb-12">
        <CompareBreadcrumb
          label={t('breadcrumbLabel')}
          hubLabel={t('hub.hero.title')}
          current={t('vitepos.hero.title')}
        />
        <SectionHeading
          as="h1"
          size="hero"
          className="max-sm:text-left"
          title={t('vitepos.hero.title')}
          subtitle={t('vitepos.hero.subtitle')}
        />
      </Section>

      {/* Answer-first block: the passage AI engines lift for the head query */}
      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('vitepos.shortAnswer.title')} />
        <p className="mt-4 font-medium">{t('vitepos.shortAnswer.wcpos')}</p>
        <p className="mt-3 text-muted-foreground">
          {t('vitepos.shortAnswer.vitepos')}
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
        <SectionHeading align="left" title={t('vitepos.glance.title')} />
        <div className="mt-6">
          <GlanceTable
            wcposHeader={t('vitepos.glance.colWcpos')}
            otherHeader={t('vitepos.glance.colVitepos')}
            rows={glanceRows}
            caption={t('vitepos.glance.caption')}
          />
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('vitepos.pricing.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('vitepos.pricing.vitepos')}</p>
          <p>{t('vitepos.pricing.wcpos')}</p>
          <p>{t('vitepos.pricing.compare')}</p>
          <p>{t.rich('vitepos.pricing.proAdds', proAddsLinks)}</p>
          <p>
            {t('vitepos.pricing.demoPrefix')}{' '}
            <a
              href="https://demo.wcpos.com/pos"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t('vitepos.pricing.demoLinkLabel')}
            </a>{' '}
            {t('vitepos.pricing.demoSuffix')}
          </p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading
          align="left"
          title={t('vitepos.viteposBetter.title')}
        />
        <p className="mt-4 text-muted-foreground">
          {t('vitepos.viteposBetter.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {VITEPOS_BETTER_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`vitepos.viteposBetter.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('vitepos.viteposBetter.outro')}
        </p>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('vitepos.choose.title')} />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(['wcpos', 'vitepos'] as const).map((key) => (
            <Card key={key} elevated className="p-6">
              <h3 className="mb-2 font-semibold">
                {t(`vitepos.choose.${key}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`vitepos.choose.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="muted" spacing="default" containerClassName="max-w-3xl">
        <SectionHeading className="mb-10" title={t('vitepos.faq.title')} />
        <div className="space-y-6">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="border-b pb-6">
              <h3 className="mb-2 text-lg font-semibold">
                {t(`vitepos.faq.${key}.question`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`vitepos.faq.${key}.answer`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('vitepos.sources.title')} />
        <p className="mt-4 text-muted-foreground">{t('vitepos.sources.intro')}</p>
        <SourceList items={SOURCES.map(({ key, url }) => ({ key, url, label: t(`vitepos.sources.items.${key}`) }))} />
      </Section>

      <MoreComparisons current="/compare/vitepos" />
      <CtaSection />

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          {t('vitepos.footer.factsDated')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('vitepos.footer.corrections')}
        </p>
      </Section>
    </main>
  )
}
