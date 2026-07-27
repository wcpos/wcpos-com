import type { Metadata } from 'next'
import { resolveLocale } from '@/i18n/resolve-locale'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ResetPasswordPageClient } from './reset-password-page-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'auth.resetPassword' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  return <ResetPasswordPageClient />
}
