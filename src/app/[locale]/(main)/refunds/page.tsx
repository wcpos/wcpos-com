import type { ReactNode } from 'react'
import { resolveLocale } from '@/i18n/resolve-locale'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { TextLink } from '@/components/ui/text-link'
import { marketingMetadata } from '@/lib/seo'
import { formatDateForLocale } from '@/lib/date-format'

const LEGAL_UPDATED_AT = '2026-08-18T12:00:00Z'
const PREVENTION_ITEMS = ['p1', 'p2', 'p3'] as const
const REFUND_ITEMS = ['y1', 'y2', 'y3'] as const
const NO_REFUND_ITEMS = ['n1', 'n2', 'n3'] as const
const WHY_PARAGRAPHS = ['p1', 'p2', 'p3', 'p4'] as const

function demoLink(chunks: ReactNode) {
  return <TextLink href="https://demo.wcpos.com/pos">{chunks}</TextLink>
}

function docsLink(chunks: ReactNode) {
  return <TextLink href="https://docs.wcpos.com">{chunks}</TextLink>
}

function emailLink(chunks: ReactNode) {
  return <TextLink href="mailto:support@wcpos.com">{chunks}</TextLink>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'legal.refunds.meta' })
  return marketingMetadata({
    locale,
    path: '/refunds',
    title: t('title'),
    description: t('description'),
  })
}

export default async function RefundsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'legal.refunds' })
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
          <h2 className="text-2xl font-semibold mb-4">{t('prevention.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            {t('prevention.lead')}
          </p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {PREVENTION_ITEMS.map((item) => (
              <li key={item}>
                <span className="font-medium text-foreground">
                  {t(`prevention.items.${item}.label`)}
                </span>{' '}
                {t.rich(`prevention.items.${item}.body`, {
                  demo: demoLink,
                  docs: docsLink,
                  email: emailLink,
                })}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('yes.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">{t('yes.lead')}</p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {REFUND_ITEMS.map((item) => (
              <li key={item}>{t(`yes.items.${item}`)}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('no.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">{t('no.lead')}</p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {NO_REFUND_ITEMS.map((item) => (
              <li key={item}>{t(`no.items.${item}`)}</li>
            ))}
          </ul>
          <p className="mt-4 leading-7 text-muted-foreground">{t('no.note')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('why.title')}</h2>
          <div className="space-y-4">
            {WHY_PARAGRAPHS.map((item) => (
              <p key={item} className="leading-7 text-muted-foreground">
                {t(`why.items.${item}`)}
              </p>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('request.title')}</h2>
          <p className="leading-7 text-muted-foreground">
            {t.rich('request.body', { email: emailLink })}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('payment.title')}</h2>
          <p className="leading-7 text-muted-foreground">{t('payment.body')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('renewals.title')}</h2>
          <p className="leading-7 text-muted-foreground">{t('renewals.body')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('rights.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            {t('rights.withdrawal')}
          </p>
          <p className="leading-7 text-muted-foreground mb-4">
            {t('rights.conformity')}
          </p>
          <p className="leading-7 text-muted-foreground">{t('rights.business')}</p>
        </section>
      </div>
    </main>
  )
}
