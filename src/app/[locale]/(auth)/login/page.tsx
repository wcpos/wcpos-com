import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LoginPageClient } from './login-page-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.login' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <LoginPageClient />
}
