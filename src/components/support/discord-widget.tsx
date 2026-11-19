'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'

// The channel embed needs no API client query string.
const WIDGETBOT_SRC = 'https://emerald.widgetbot.io/channels/711884517081612298/1093100746372829254/'

export function DiscordWidget() {
  const t = useTranslations('support.discord')
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative h-full w-full">
      <iframe
        src={WIDGETBOT_SRC}
        title={t('embedTitle')}
        allow="clipboard-write; fullscreen"
        loading="lazy"
        className="block h-full w-full border-0 bg-[#36393e]"
        onLoad={() => setLoaded(true)}
      />
      {/* WidgetBot paints an empty dark panel while it boots, so keep the skeleton until load. */}
      {!loaded && (
        <Skeleton
          aria-hidden
          data-testid="discord-widget-skeleton"
          className="pointer-events-none absolute inset-0 h-full w-full rounded-none"
        />
      )}
    </div>
  )
}
