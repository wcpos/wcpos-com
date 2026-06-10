import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { DiscordWidget } from '@/components/support/discord-widget'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return marketingMetadata({
    locale,
    path: '/support',
    title: 'Support',
    description: 'Get support for WooCommerce POS through our Discord community.',
  })
}

function DiscordSkeleton() {
  return <div className="flex-1 animate-pulse bg-muted" />
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="flex flex-col" style={{ height: 'calc(100vh - 65px)' }}>
      <Suspense fallback={<DiscordSkeleton />}>
        <DiscordWidget />
      </Suspense>
    </main>
  )
}
