'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'

const DiscordWidget = dynamic(
  () => import('@/components/support/discord-widget').then((m) => m.DiscordWidget),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
)

export function DiscordSection() {
  const t = useTranslations('support.discord')
  // The WidgetBot iframe mounts only on request: eager-mounting it pulled
  // third-party cookies (cdn.discordapp.com), five foreign webfonts and the
  // embed's assets into every /support visit, and broke bfcache. The facade
  // keeps the exact 600px frame so loading causes no layout shift.
  const [chatRequested, setChatRequested] = useState(false)

  return (
    <Section id="discord" spacing="default">
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>
      <div className="mx-auto h-[600px] max-w-3xl overflow-hidden rounded-md border">
        {chatRequested ? (
          <DiscordWidget />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/40 px-8 text-center">
            <MessagesSquare
              className="h-10 w-10 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="max-w-sm text-sm text-muted-foreground">
              {t('embedNote')}
            </p>
            <Button onClick={() => setChatRequested(true)}>
              {t('loadChat')}
            </Button>
            <a
              href="/discord"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t('openInDiscord')}
            </a>
          </div>
        )}
      </div>
    </Section>
  )
}
