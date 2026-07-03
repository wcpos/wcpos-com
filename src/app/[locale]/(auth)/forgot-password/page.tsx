import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { ForgotPasswordPageClient } from './forgot-password-page-client'

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Request a password reset link for your WCPOS account.',
  robots: { index: false, follow: false },
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ForgotPasswordPageClient />
}
