import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { RegisterPageClient } from './register-page-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.register' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <RegisterPageClient />
}
