import { getTranslations, setRequestLocale } from 'next-intl/server'
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

const COMPARE_NAMESPACE = 'compare'

/**
 * Comparison-table row keys. The glance table is the passage AI answer
 * engines extract for "WCPOS vs Oliver" queries — keep every cell
 * self-contained (entity names in the header, one fact per cell).
 */
const GLANCE_ROW_KEYS = [
  'architecture',
  'freePlan',
  'pricing',
  'stopPaying',
  'license',
  'fees',
  'terminals',
  'platforms',
  'offline',
  'kiosk',
  'display',
  'openSource',
  'wporg',
] as const

const FREE_TIER_ROW_KEYS = [
  'products',
  'transactions',
  'devices',
  'offline',
  'receipts',
] as const

const FAQ_KEYS = [
  'offline',
  'fees',
  'singleDev',
  'subscription',
  'expiry',
  'trial',
] as const

const CLAIM_KEYS = [
  'apps',
  'multiOutlet',
  'payments',
  'hobbyShops',
  'singleDev',
] as const

const OLIVER_BETTER_KEYS = [
  'kiosk',
  'display',
  'hardware',
  'subscriptions',
  'rating',
] as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })
  return marketingMetadata({
    locale,
    path: '/compare/oliver-pos',
    title: t('oliver.metadata.title'),
    description: t('oliver.metadata.description'),
  })
}

type Translate = (key: string) => string

function OliverCompareJsonLd({
  locale,
  translate,
}: {
  locale: string
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
              name: translate(`oliver.faq.${key}.question`),
              acceptedAnswer: {
                '@type': 'Answer',
                text: translate(`oliver.faq.${key}.answer`),
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
                name: translate('oliver.hero.title'),
                item: localeUrl(locale, '/compare/oliver-pos'),
              },
            ],
          },
        ]),
      }}
    />
  )
}

function ComparisonTable({
  featureHeader,
  wcposHeader,
  oliverHeader,
  rows,
  caption,
}: {
  featureHeader?: string
  wcposHeader: string
  oliverHeader: string
  rows: { label: string; wcpos: string; oliver: string }[]
  caption?: string
}) {
  return (
    <Table>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          <TableHead>{featureHeader ?? ''}</TableHead>
          <TableHead>{wcposHeader}</TableHead>
          <TableHead>{oliverHeader}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell>{row.wcpos}</TableCell>
            <TableCell>{row.oliver}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function OliverComparePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })
  // next-intl's Translator is key-typed; JSON-LD and the key lists above
  // build keys dynamically, so widen to a plain string-keyed function.
  const translate: Translate = (key) => t(key as Parameters<typeof t>[0])

  const glanceRows = GLANCE_ROW_KEYS.map((key) => ({
    label: t(`oliver.glance.rows.${key}.label`),
    wcpos: t(`oliver.glance.rows.${key}.wcpos`),
    oliver: t(`oliver.glance.rows.${key}.oliver`),
  }))

  const freeTierRows = FREE_TIER_ROW_KEYS.map((key) => ({
    label: t(`oliver.freeTier.rows.${key}.label`),
    wcpos: t(`oliver.freeTier.rows.${key}.wcpos`),
    oliver: t(`oliver.freeTier.rows.${key}.oliver`),
  }))

  return (
    <main>
      <OliverCompareJsonLd locale={locale} translate={translate} />

      <Section tone="default" spacing="hero">
        <SectionHeading
          as="h1"
          size="hero"
          title={t('oliver.hero.title')}
          subtitle={t('oliver.hero.subtitle')}
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
        <SectionHeading align="left" title={t('oliver.shortAnswer.title')} />
        <p className="mt-4 font-medium">{t('oliver.shortAnswer.wcpos')}</p>
        <p className="mt-3 text-muted-foreground">
          {t('oliver.shortAnswer.oliver')}
        </p>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-5xl">
        <SectionHeading align="left" title={t('oliver.glance.title')} />
        <div className="mt-6">
          <ComparisonTable
            wcposHeader={t('oliver.glance.colWcpos')}
            oliverHeader={t('oliver.glance.colOliver')}
            rows={glanceRows}
            caption={t('oliver.glance.caption')}
          />
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.architecture.title')} />
        <p className="mt-4 text-muted-foreground">
          {t('oliver.architecture.intro')}
        </p>
        <div className="mt-6 space-y-5">
          {(['dataOwnership', 'failureModes', 'longevity'] as const).map(
            (key) => (
              <div key={key}>
                <h3 className="font-semibold">
                  {t(`oliver.architecture.${key}.title`)}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t(`oliver.architecture.${key}.body`)}
                </p>
              </div>
            )
          )}
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.freeTier.title')} />
        <p className="mt-4 text-muted-foreground">{t('oliver.freeTier.intro')}</p>
        <div className="mt-6">
          <ComparisonTable
            featureHeader={t('oliver.freeTier.colFeature')}
            wcposHeader={t('oliver.glance.colWcpos')}
            oliverHeader={t('oliver.glance.colOliver')}
            rows={freeTierRows}
          />
        </div>
        <p className="mt-6">{t('oliver.freeTier.outro1')}</p>
        <p className="mt-3 text-muted-foreground">
          {t('oliver.freeTier.outro2')}
        </p>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.pricing.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('oliver.pricing.oliver')}</p>
          <p>{t('oliver.pricing.wcpos')}</p>
          <p>{t('oliver.pricing.math')}</p>
          <p>{t('oliver.pricing.proAdds')}</p>
          <p>
            {t('oliver.pricing.demoPrefix')}{' '}
            <a
              href="https://demo.wcpos.com/pos"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t('oliver.pricing.demoLinkLabel')}
            </a>{' '}
            {t('oliver.pricing.demoSuffix')}
          </p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.oliverBetter.title')} />
        <p className="mt-4 text-muted-foreground">
          {t('oliver.oliverBetter.intro')}
        </p>
        <ul className="mt-4 space-y-3">
          {OLIVER_BETTER_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>{t(`oliver.oliverBetter.${key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-foreground">
          {t('oliver.oliverBetter.outro')}
        </p>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.ratings.title')} />
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t('oliver.ratings.intro')}</p>
          <p>{t('oliver.ratings.wcpos')}</p>
          <p>{t('oliver.ratings.oliver')}</p>
          <p>{t('oliver.ratings.activity')}</p>
        </div>
      </Section>

      <Section tone="muted" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.claims.title')} />
        <p className="mt-4 text-muted-foreground">{t('oliver.claims.intro')}</p>
        <div className="mt-6 space-y-5">
          {CLAIM_KEYS.map((key) => (
            <div key={key} className="flex gap-2">
              <X
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <h3 className="font-semibold">
                  &ldquo;{t(`oliver.claims.${key}.claim`)}&rdquo;
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t(`oliver.claims.${key}.response`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading align="left" title={t('oliver.choose.title')} />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(['wcpos', 'oliver'] as const).map((key) => (
            <Card key={key} elevated className="p-6">
              <h3 className="mb-2 font-semibold">
                {t(`oliver.choose.${key}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`oliver.choose.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="muted" spacing="default" containerClassName="max-w-3xl">
        <SectionHeading className="mb-10" title={t('oliver.faq.title')} />
        <div className="space-y-6">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="border-b pb-6">
              <h3 className="mb-2 text-lg font-semibold">
                {t(`oliver.faq.${key}.question`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`oliver.faq.${key}.answer`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          {t('oliver.footer.factsVerified')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('oliver.footer.corrections')}
        </p>
      </Section>
    </main>
  )
}
