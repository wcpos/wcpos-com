import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'
import { marketingMetadata } from '@/lib/seo'
import { formatDateForLocale } from '@/lib/date-format'

const LEGAL_UPDATED_AT = '2026-06-10T12:00:00Z'
const COLLECT_ITEMS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'] as const
const COOKIE_ITEMS = ['k1', 'k2', 'k3', 'k4', 'k5'] as const
const PROCESSOR_ITEMS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const
const RETENTION_ITEMS = ['r1', 'r2', 'r3', 'r4'] as const

function emailLink(chunks: ReactNode) {
  return <TextLink href="mailto:support@wcpos.com">{chunks}</TextLink>
}

function code(chunks: ReactNode) {
  return <code>{chunks}</code>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal.privacy.meta' })
  return marketingMetadata({
    locale,
    path: '/privacy',
    title: t('title'),
    description: t('description'),
  })
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'legal.privacy' })
  const updatedDate = formatDateForLocale(LEGAL_UPDATED_AT, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('lastUpdated', { date: updatedDate })}
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <p className="leading-7 text-muted-foreground">{t('intro')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('collect.title')}</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {COLLECT_ITEMS.map((item) => (
              <li key={item}>
                <span className="font-medium text-foreground">
                  {t(`collect.items.${item}.label`)}
                </span>{' '}
                {t.rich(`collect.items.${item}.body`, { code })}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('cookies.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            {t('cookies.body')}
          </p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {COOKIE_ITEMS.map((item) => (
              <li key={item}>{t.rich(`cookies.items.${item}`, { code })}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('processors.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            {t('processors.body')}
          </p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {PROCESSOR_ITEMS.map((item) => (
              <li key={item}>
                <span className="font-medium text-foreground">
                  {t(`processors.items.${item}.label`)}
                </span>{' '}
                {t(`processors.items.${item}.body`)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('retention.title')}</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {RETENTION_ITEMS.map((item) => (
              <li key={item}>{t(`retention.items.${item}`)}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('rights.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">{t('rights.body')}</p>
          <p className="leading-7 text-muted-foreground">
            {t.rich('rights.exercise', { email: emailLink })}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('changes.title')}</h2>
          <p className="leading-7 text-muted-foreground">{t('changes.body')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('contact.title')}</h2>
          <p className="leading-7 text-muted-foreground">
            {t.rich('contact.body', {
              email: emailLink,
              support: (chunks) => (
                <TextLink asChild>
                  <Link href="/support">{chunks}</Link>
                </TextLink>
              ),
            })}
          </p>
        </section>
      </div>
    </main>
  )
}
