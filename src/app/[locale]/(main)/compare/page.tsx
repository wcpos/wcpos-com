import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { ArrowRight, Scale } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'
import { localeUrl, marketingMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

const COMPARE_NAMESPACE = 'compare'

const COMPARISONS = [
  { key: 'oliverCard', href: '/compare/oliver-pos' },
  { key: 'woocommerceCard', href: '/compare/woocommerce-pos' },
  { key: 'squareCard', href: '/compare/square' },
  { key: 'jovvieCard', href: '/compare/jovvie' },
  { key: 'viteposCard', href: '/compare/vitepos' },
  { key: 'yithCard', href: '/compare/yith-pos' },
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
    path: '/compare',
    title: t('hub.metadata.title'),
    description: t('hub.metadata.description'),
  })
}

function CompareHubJsonLd({
  name,
  items,
}: {
  name: string
  items: { name: string; url: string }[]
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name,
          itemListElement: items.map(({ name, url }, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name,
            url,
          })),
        }),
      }}
    />
  )
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })

  return (
    <main>
      <CompareHubJsonLd
        name={t('hub.metadata.title')}
        items={COMPARISONS.map(({ key, href }) => ({
          name: t(`hub.${key}.title`),
          url: localeUrl(locale, href),
        }))}
      />

      <Section tone="default" spacing="hero">
        <SectionHeading
          as="h1"
          size="hero"
          title={t('hub.hero.title')}
          subtitle={t('hub.hero.subtitle')}
        />
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <Card className="border-l-4 border-l-primary p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Scale className="h-5 w-5 shrink-0" aria-hidden />
            {t('disclosure.title')}
          </h2>
          <p className="text-muted-foreground">{t('disclosure.body')}</p>
        </Card>
      </Section>

      <Section tone="muted" spacing="default" containerClassName="max-w-3xl">
        <div className="space-y-6">
          {COMPARISONS.map(({ key, href }) => (
            <Card key={key} elevated className="p-6">
              <h2 className="mb-2 text-xl font-semibold">
                {t(`hub.${key}.title`)}
              </h2>
              <p className="mb-4 text-muted-foreground">
                {t(`hub.${key}.description`)}
              </p>
              <TextLink asChild>
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 font-medium"
                >
                  {t(`hub.${key}.cta`)}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </TextLink>
            </Card>
          ))}
          <p className="text-sm text-muted-foreground">{t('hub.moreSoon')}</p>
        </div>
      </Section>

      <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
        <SectionHeading
          align="left"
          title={t('hub.method.title')}
          subtitle={t('hub.method.body')}
        />
      </Section>
    </main>
  )
}
