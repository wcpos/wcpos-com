'use client'

import dynamic from 'next/dynamic'

const DiscordWidget = dynamic(
  () => import('@/components/support/discord-widget').then((m) => m.DiscordWidget),
  {
    ssr: false,
    loading: () => <div className="h-[600px] w-full animate-pulse rounded-md bg-muted" />,
  }
)

export function DiscordSection() {
  return (
    <section id="discord" className="container mx-auto px-4 py-16">
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Prefer to talk to a human?</h2>
        <p className="text-muted-foreground">
          Join store owners and the team in our live Discord community.
        </p>
      </div>
      <div className="mx-auto h-[600px] max-w-3xl overflow-hidden rounded-md border">
        <DiscordWidget />
      </div>
    </section>
  )
}
