import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'
import { EXTENSIONS, EXTENSIONS_DOCS_URL } from '@/lib/extensions-catalog'
import { marketingMetadata } from '@/lib/seo'

// A new catalog category needs a group here, or the page test fails.
export const EXTENSION_GROUPS = [
  { key: 'payments', categories: ['payments'] },
  { key: 'stockCoupons', categories: ['inventory', 'coupons'] },
  { key: 'multilingual', categories: ['catalog'] },
] as const

// Gateways that are not card terminals; listed after the terminals.
export const PAYMENTS_LAST = ['email-invoice-gateway', 'wcpos-vipps'] as const
const isLast = (slug: string) => PAYMENTS_LAST.some((s) => s === slug)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'extensions' })
  return marketingMetadata({
    locale,
    path: '/extensions',
    title: t('metadata.title'),
    description: t('metadata.description'),
  })
}

export default async function ExtensionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'extensions' })

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: t('metadata.title'),
            itemListElement: EXTENSIONS.map(({ name, docsUrl }, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name,
              url: docsUrl,
            })),
          }),
        }}
      />

      <Section tone="default" spacing="hero">
        <SectionHeading
          as="h1"
          size="hero"
          title={t('hero.title')}
          subtitle={t('hero.subtitle')}
        />
      </Section>

      <Section tone="muted" spacing="default">
        {EXTENSION_GROUPS.map(({ key, categories }, groupIndex) => {
          const inGroup = EXTENSIONS.filter((e) =>
            categories.some((c) => c === e.category),
          )
          const items = [
            ...inGroup.filter((e) => !isLast(e.slug)),
            ...inGroup.filter((e) => isLast(e.slug)),
          ]
          return (
            <section
              key={key}
              aria-labelledby={`group-${key}`}
              className={groupIndex > 0 ? 'mt-14' : undefined}
            >
              <h2
                id={`group-${key}`}
                className="text-2xl font-semibold tracking-tight"
              >
                {t(`groups.${key}`)}
              </h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(({ slug, name, description, requiresPro, docsUrl }) => (
                  <li key={slug}>
                    <Card elevated className="flex h-full flex-col p-6">
                      <div>
                        <h3
                          lang="en"
                          className="inline align-middle text-lg font-semibold"
                        >
                          {name}
                        </h3>
                        {requiresPro && (
                          <Badge variant="brand-tint" className="ml-2 align-middle">
                            {t('proTag')}
                          </Badge>
                        )}
                      </div>
                      <p lang="en" className="mt-2 flex-1 text-muted-foreground">
                        {description}
                      </p>
                      <TextLink asChild>
                        <a
                          href={docsUrl}
                          aria-label={t('docsLink', { name })}
                          className="mt-4 inline-flex items-center gap-1 whitespace-nowrap font-medium"
                        >
                          {t('docsLinkShort')}
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </a>
                      </TextLink>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
        <p className="mt-8 text-sm text-muted-foreground">{t('englishNotice')}</p>
        <TextLink asChild>
          <a href={EXTENSIONS_DOCS_URL}>{t('allDocsLink')}</a>
        </TextLink>
      </Section>
    </main>
  )
}
