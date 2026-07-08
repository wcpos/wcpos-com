import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'
import { marketingMetadata } from '@/lib/seo'
import { formatDateForLocale } from '@/lib/date-format'

const LEGAL_UPDATED_AT = '2026-06-10T12:00:00Z'
const ACCOUNT_ITEMS = ['a1', 'a2', 'a3'] as const
const LICENSE_ITEMS = ['l1', 'l2', 'l3', 'l4', 'l5'] as const
const ACCEPTABLE_USE_ITEMS = ['u1', 'u2', 'u3', 'u4'] as const

function emailLink(chunks: ReactNode) {
  return <TextLink href="mailto:support@wcpos.com">{chunks}</TextLink>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal.terms.meta' })
  return marketingMetadata({
    locale,
    path: '/terms',
    title: t('title'),
    description: t('description'),
  })
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'legal.terms' })
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
          <h2 className="text-2xl font-semibold mb-4">{t('service.title')}</h2>
          <p className="leading-7 text-muted-foreground">{t('service.body')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('gpl.title')}</h2>
          <p className="leading-7 text-muted-foreground">{t('gpl.body')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('account.title')}</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {ACCOUNT_ITEMS.map((item) => (
              <li key={item}>{t.rich(`account.items.${item}`, { email: emailLink })}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('licenses.title')}</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {LICENSE_ITEMS.map((item) => (
              <li key={item}>
                {t.rich(`licenses.items.${item}`, {
                  strong: (chunks) => (
                    <span className="font-medium text-foreground">{chunks}</span>
                  ),
                  policy: (chunks) => (
                    <TextLink asChild>
                      <Link href="/refunds">{chunks}</Link>
                    </TextLink>
                  ),
                })}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('acceptableUse.title')}</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            {t('acceptableUse.body')}
          </p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            {ACCEPTABLE_USE_ITEMS.map((item) => (
              <li key={item}>{t(`acceptableUse.items.${item}`)}</li>
            ))}
          </ul>
        </section>

        {(['warranty', 'liability', 'termination', 'changes'] as const).map((section) => (
          <section key={section}>
            <h2 className="text-2xl font-semibold mb-4">{t(`${section}.title`)}</h2>
            <p className="leading-7 text-muted-foreground">{t(`${section}.body`)}</p>
          </section>
        ))}

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
