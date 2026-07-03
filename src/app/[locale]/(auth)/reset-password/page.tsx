import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { ResetPasswordPageClient } from './reset-password-page-client'

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Choose a new password for your WCPOS account.',
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ResetPasswordPageClient />
}
