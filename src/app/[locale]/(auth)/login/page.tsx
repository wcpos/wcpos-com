import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { LoginPageClient } from './login-page-client'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your WCPOS account to manage your orders, licenses, and downloads.',
  robots: { index: false, follow: false },
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
