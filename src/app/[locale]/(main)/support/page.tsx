import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SupportDefaultContent, SupportPageContent } from '@/components/support/support-chat'
import { marketingMetadata } from '@/lib/seo'
import { clientMessages } from '@/i18n/client-messages'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'support.meta' })
  return marketingMetadata({
    locale,
    path: '/support',
    title: t('title'),
    description: t('description'),
  })
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={clientMessages(messages, ['support'])}>
      <main>
        <Suspense fallback={<SupportDefaultContent />}>
          <SupportPageContent />
        </Suspense>
      </main>
    </NextIntlClientProvider>
  )
}
