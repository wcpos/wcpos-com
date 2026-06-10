import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { RegisterPageClient } from './register-page-client'

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Sign up for a WCPOS account to purchase Pro, manage licenses, and access downloads.',
  robots: { index: false, follow: false },
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
