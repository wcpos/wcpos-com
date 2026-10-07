import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Check, Scale } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { localeUrl, marketingMetadata } from '@/lib/seo'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

const COMPARE_NAMESPACE = 'compare'

/**
 * Comparison-table row keys. The glance table is the passage AI answer
 * engines extract for "WCPOS vs FooSales" queries — keep every cell
 * self-contained (entity names in the header, one fact per cell).
 */
const GLANCE_ROW_KEYS = [
  'price',
  'stopPaying',
  'cardPayments',
  'tapToPay',
  'apps',
  'offline',
  'devices',
  'stores',
  'ratings',
] as const

const FOOSALES_BETTER_KEYS = ['tapToPay', 'offline'] as const

const FAQ_KEYS = ['price', 'cancel', 'offline', 'terminals', 'apps', 'expiry'] as const

/**
 * The FooSales pages every FooSales fact on this page was read from, on 2026-10-07.
 * The URLs are not translated.
 */
const SOURCES = [
  { key: 'pricing', url: 'https://www.foosales.com/pricing/' },
  { key: 'helpPricing', url: 'https://help.foosales.com/docs/topics/introduction/pricing/' },
  { key: 'userAddon', url: 'https://www.foosales.com/product/user-add-on/' },
  { key: 'deviceAddon', url: 'https://www.foosales.com/product/device-add-on/' },
  { key: 'cancel', url: 'https://help.foosales.com/docs/topics/my-account/canceling-your-plan/' },
  {
    key: 'cardReaders',
    url: 'https://help.foosales.com/docs/frequently-asked-questions/pre-sales/does-foosales-process-payments-or-integrate-with-third-party-card-readers/',
  },
  { key: 'payments', url: 'https://www.foosales.com/features/payments/' },
  { key: 'platform', url: 'https://www.foosales.com/features/platform/' },
  {
    key: 'requirements',
    url: 'https://help.foosales.com/docs/topics/foosales-ios-and-android-apps/minimum-requirements/',
  },
  { key: 'offlineFeature', url: 'https://www.foosales.com/features/offline-mode/' },
  { key: 'offlineHelp', url: 'https://help.foosales.com/docs/topics/offline-mode/' },
  { key: 'roadmap', url: 'https://help.foosales.com/docs/topics/foosales-roadmap/' },
  { key: 'appStore', url: 'https://apps.apple.com/us/app/foosales-for-woocommerce/id1251207715' },
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
    path: '/compare/foosales',
    title: t('foosales.metadata.title'),
    description: t('foosales.metadata.description'),
  })
}

type Translate = (key: string) => string

function FoosalesCompareJsonLd({
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
              name: translate(`foosales.faq.${key}.question`),
              acceptedAnswer: {
                '@type': 'Answer',
                text: translate(`foosales.faq.${key}.answer`),
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
                name: translate('foosales.hero.title'),
                item: localeUrl(locale, '/compare/foosales'),
              },
            ],
          },
        ]),
      }}
    />
  )
}

function ComparisonTable({
  wcposHeader,
  foosalesHeader,
  rows,
  caption,
}: {
  wcposHeader: string
  foosalesHeader: string
  rows: { label: string; wcpos: string; foosales: string }[]
  caption?: string
}) {
  return (
    <Table>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          <td />
          <TableHead scope="col">{wcposHeader}</TableHead>
          <TableHead scope="col">{foosalesHeader}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <th scope="row" className="p-2 text-left align-middle font-medium">
              {row.label}
            </th>
            <TableCell>{row.wcpos}</TableCell>
            <TableCell>{row.foosales}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function FoosalesComparePage({
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
    label: t(`foosales.glance.rows.${key}.label`),
    wcpos: t(`foosales.glance.rows.${key}.wcpos`),
    foosales: t(`foosales.glance.rows.${key}.foosales`),
  }))

  return (
    <main>
      <FoosalesCompareJsonLd locale={locale} translate={translate} />

      <Section tone="default" spacing="hero">
        <SectionHeading
          as="h1"
          size="hero"
          title={t('foosales.hero.title')}
          subtitle={t('foosales.hero.subtitle')}
        />
      </Section>

      <Section tone="default" spacing="none" containerClassName="max-w-3xl">
        <Card className="border-l-4 border-l-primary p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Scale className="h-5 w-5 shrink-0" aria-hidden />
            {t('disclosure.title')}
          </h2>
          <p className="text-muted-foreground">{t('disclosure.body')}</p>
        </Card>
      </Section>

      {/* Answer-first block: the passage AI engines lift for the head query */}
      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('foosales.shortAnswer.title')} />
        <p className="mt-4 font-medium">{t('foosales.shortAnswer.wcpos')}</p>
        <p className="mt-3 text-muted-foreground">
          {t('foosales.shortAnswer.foosales')}
        </p>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-5xl">
        <SectionHeading align="left" title={t('foosales.glance.title')} />
        <div className="mt-6">
          <ComparisonTable
            wcposHeader={t('foosales.glance.colWcpos')}
            foosalesHeader={t('foosales.glance.colFoosales')}
            rows={glanceRows}
            caption={t('foosales.glance.caption')}
          />
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('foosales.pricing.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('foosales.pricing.foosales')}</p>
          <p>{t('foosales.pricing.wcpos')}</p>
          <p>{t('foosales.pricing.compare')}</p>
          <p>{t('foosales.pricing.proAdds')}</p>
          <p>
            {t('foosales.pricing.demoPrefix')}{' '}
            <a
              href="https://demo.wcpos.com/pos"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t('foosales.pricing.demoLinkLabel')}
            </a>{' '}
            {t('foosales.pricing.demoSuffix')}
          </p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading
          align="left"
          title={t('foosales.foosalesBetter.title')}
        />
        <p className="mt-4 text-muted-foreground">
          {t('foosales.foosalesBetter.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {FOOSALES_BETTER_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`foosales.foosalesBetter.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('foosales.foosalesBetter.outro')}
        </p>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('foosales.choose.title')} />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(['wcpos', 'foosales'] as const).map((key) => (
            <Card key={key} elevated className="p-6">
              <h3 className="mb-2 font-semibold">
                {t(`foosales.choose.${key}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`foosales.choose.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="muted" spacing="default" containerClassName="max-w-3xl">
        <SectionHeading className="mb-10" title={t('foosales.faq.title')} />
        <div className="space-y-6">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="border-b pb-6">
              <h3 className="mb-2 text-lg font-semibold">
                {t(`foosales.faq.${key}.question`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`foosales.faq.${key}.answer`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('foosales.sources.title')} />
        <p className="mt-4 text-muted-foreground">{t('foosales.sources.intro')}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {SOURCES.map(({ key, url }) => (
            <li key={key}>
              {t(`foosales.sources.items.${key}`)}:{' '}
              <a href={url} rel="nofollow" className="break-all font-medium text-foreground underline underline-offset-4">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          {t('foosales.footer.factsDated')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('foosales.footer.corrections')}
        </p>
      </Section>
    </main>
  )
}
