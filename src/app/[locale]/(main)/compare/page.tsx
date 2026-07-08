import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, Scale } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'
import { localeUrl, marketingMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

const COMPARE_NAMESPACE = 'compare'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })
  return marketingMetadata({
    locale,
    path: '/compare',
    title: t('hub.metadata.title'),
    description: t('hub.metadata.description'),
  })
}

function CompareHubJsonLd({
  locale,
  name,
  itemName,
}: {
  locale: string
  name: string
  itemName: string
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: itemName,
              url: localeUrl(locale, '/compare/oliver-pos'),
            },
          ],
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
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: COMPARE_NAMESPACE })

  return (
    <main>
      <CompareHubJsonLd
        locale={locale}
        name={t('hub.metadata.title')}
        itemName={t('hub.oliverCard.title')}
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
          <Card elevated className="p-6">
            <h2 className="mb-2 text-xl font-semibold">
              {t('hub.oliverCard.title')}
            </h2>
            <p className="mb-4 text-muted-foreground">
              {t('hub.oliverCard.description')}
            </p>
            <TextLink asChild>
              <Link
                href="/compare/oliver-pos"
                className="inline-flex items-center gap-1 font-medium"
              >
                {t('hub.oliverCard.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </TextLink>
          </Card>
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
