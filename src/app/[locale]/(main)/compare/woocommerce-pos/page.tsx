import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Check, Scale, X } from 'lucide-react'
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
 * engines extract for "WCPOS vs WooCommerce POS" queries — keep every cell
 * self-contained (entity names in the header, one fact per cell).
 */
const GLANCE_ROW_KEYS = [
  'where',
  'devices',
  'countries',
  'price',
  'cardPayments',
  'gateways',
  'fees',
  'offline',
  'multiLocation',
  'barcode',
] as const

const LIMIT_KEYS = [
  'tablets',
  'countries',
  'products',
  'offline',
  'multiLocation',
  'gateways',
] as const

const WOOCOMMERCE_BETTER_KEYS = [
  'price',
  'official',
  'wooPayments',
] as const

const FAQ_KEYS = [
  'free',
  'countries',
  'offline',
  'devices',
  'tapToPay',
  'expiry',
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
    path: '/compare/woocommerce-pos',
    title: t('woocommerce.metadata.title'),
    description: t('woocommerce.metadata.description'),
  })
}

type Translate = (key: string) => string

function WoocommerceCompareJsonLd({
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
              name: translate(`woocommerce.faq.${key}.question`),
              acceptedAnswer: {
                '@type': 'Answer',
                text: translate(`woocommerce.faq.${key}.answer`),
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
                name: translate('woocommerce.hero.title'),
                item: localeUrl(locale, '/compare/woocommerce-pos'),
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
  woocommerceHeader,
  rows,
  caption,
}: {
  wcposHeader: string
  woocommerceHeader: string
  rows: { label: string; wcpos: string; woocommerce: string }[]
  caption?: string
}) {
  return (
    <Table>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          <td />
          <TableHead scope="col">{wcposHeader}</TableHead>
          <TableHead scope="col">{woocommerceHeader}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <th scope="row" className="p-2 text-left align-middle font-medium">
              {row.label}
            </th>
            <TableCell>{row.wcpos}</TableCell>
            <TableCell>{row.woocommerce}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function WoocommerceComparePage({
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
    label: t(`woocommerce.glance.rows.${key}.label`),
    wcpos: t(`woocommerce.glance.rows.${key}.wcpos`),
    woocommerce: t(`woocommerce.glance.rows.${key}.woocommerce`),
  }))

  return (
    <main>
      <WoocommerceCompareJsonLd locale={locale} translate={translate} />

      <Section tone="default" spacing="hero">
        <SectionHeading
          as="h1"
          size="hero"
          title={t('woocommerce.hero.title')}
          subtitle={t('woocommerce.hero.subtitle')}
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
        <SectionHeading align="left" title={t('woocommerce.shortAnswer.title')} />
        <p className="mt-4 font-medium">{t('woocommerce.shortAnswer.wcpos')}</p>
        <p className="mt-3 text-muted-foreground">
          {t('woocommerce.shortAnswer.woocommerce')}
        </p>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-5xl">
        <SectionHeading align="left" title={t('woocommerce.glance.title')} />
        <div className="mt-6">
          <ComparisonTable
            wcposHeader={t('woocommerce.glance.colWcpos')}
            woocommerceHeader={t('woocommerce.glance.colWoocommerce')}
            rows={glanceRows}
            caption={t('woocommerce.glance.caption')}
          />
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('woocommerce.devices.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('woocommerce.devices.woocommerce')}</p>
          <p>{t('woocommerce.devices.wcpos')}</p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('woocommerce.payments.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('woocommerce.payments.woocommerce')}</p>
          <p>{t('woocommerce.payments.wcpos')}</p>
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('woocommerce.pricing.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('woocommerce.pricing.woocommerce')}</p>
          <p>{t('woocommerce.pricing.wcpos')}</p>
          <p>{t('woocommerce.pricing.proAdds')}</p>
          <p>
            {t('woocommerce.pricing.demoPrefix')}{' '}
            <a
              href="https://demo.wcpos.com/pos"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t('woocommerce.pricing.demoLinkLabel')}
            </a>{' '}
            {t('woocommerce.pricing.demoSuffix')}
          </p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('woocommerce.limits.title')} />
        <p className="mt-4 text-muted-foreground">
          {t('woocommerce.limits.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {LIMIT_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <X
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`woocommerce.limits.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('woocommerce.limits.outro')}
        </p>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading
          align="left"
          title={t('woocommerce.woocommerceBetter.title')}
        />
        <p className="mt-4 text-muted-foreground">
          {t('woocommerce.woocommerceBetter.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {WOOCOMMERCE_BETTER_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`woocommerce.woocommerceBetter.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('woocommerce.woocommerceBetter.outro')}
        </p>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('woocommerce.choose.title')} />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(['wcpos', 'woocommerce'] as const).map((key) => (
            <Card key={key} elevated className="p-6">
              <h3 className="mb-2 font-semibold">
                {t(`woocommerce.choose.${key}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`woocommerce.choose.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="default" containerClassName="max-w-3xl">
        <SectionHeading className="mb-10" title={t('woocommerce.faq.title')} />
        <div className="space-y-6">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="border-b pb-6">
              <h3 className="mb-2 text-lg font-semibold">
                {t(`woocommerce.faq.${key}.question`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`woocommerce.faq.${key}.answer`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          {t('woocommerce.footer.factsDated')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('woocommerce.footer.corrections')}
        </p>
      </Section>
    </main>
  )
}
