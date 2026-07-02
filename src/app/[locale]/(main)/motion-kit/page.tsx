import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { MotionKitDemo } from './motion-kit-demo'

/**
 * Prototype route for evaluating the motion kit (ADR 0013) — not linked
 * from navigation, noindexed, and intentionally English-only. Delete or
 * fold into real pages once the kit pieces are adopted.
 */

export const metadata: Metadata = {
  title: 'Motion kit — prototype',
  robots: { index: false, follow: false },
}

export default async function MotionKitPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <MotionKitDemo />
}
