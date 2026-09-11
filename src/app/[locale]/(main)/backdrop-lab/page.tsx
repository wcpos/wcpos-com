import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { BackdropLabClient } from '@/components/lab/backdrop-lab-client'

export const metadata: Metadata = {
  title: 'Backdrop lab',
  robots: { index: false, follow: false },
}

/**
 * Prototype route for choosing the site's signature animated backdrop
 * (owner evaluates full-fidelity options here before anything ships to the
 * homepage). Delete once a direction is chosen and the winner moves into
 * the motion kit.
 */
export default async function BackdropLabPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <BackdropLabClient />
}
