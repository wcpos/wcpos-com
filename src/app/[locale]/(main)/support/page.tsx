import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { DiscordWidget } from '@/components/support/discord-widget'

export const metadata = {
  title: 'Support',
  description: 'Get support for WooCommerce POS through our Discord community.',
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
