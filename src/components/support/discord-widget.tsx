'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'

// The channel embed needs no API client query string.
const WIDGETBOT_SRC = 'https://emerald.widgetbot.io/channels/711884517081612298/1093100746372829254/'
const WIDGETBOT_ORIGIN = 'https://emerald.widgetbot.io'
// Measured 2026-11-19: the channel paints 250 to 400 ms after WidgetBot's ready message.
const PAINT_GRACE_MS = 600
// Measured 2026-11-19: ready arrives about 350 ms after load; this covers a ready that never comes.
const READY_FALLBACK_MS = 6000

function isReadyMessage(raw: unknown) {
  let data = raw
  try {
    if (typeof data === 'string') data = JSON.parse(data)
  } catch {
    return false
  }
  const message = data as { widgetbot?: unknown; event?: unknown } | null
  return message?.widgetbot === true && message.event === 'ready'
}

export function DiscordWidget() {
  const t = useTranslations('support.discord')
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== WIDGETBOT_ORIGIN || event.source !== iframeRef.current?.contentWindow) return
      if (readyTimer.current || !isReadyMessage(event.data)) return
      readyTimer.current = setTimeout(() => setLoaded(true), PAINT_GRACE_MS)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      clearTimeout(readyTimer.current)
      clearTimeout(fallbackTimer.current)
    }
  }, [])

  function onLoad() {
    if (fallbackTimer.current) return
    fallbackTimer.current = setTimeout(() => setLoaded(true), READY_FALLBACK_MS)
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={iframeRef}
        src={WIDGETBOT_SRC}
        title={t('embedTitle')}
        allow="clipboard-write; fullscreen"
        loading="lazy"
        className="block h-full w-full border-0 bg-[#36393e]"
        onLoad={onLoad}
      />
      {/* load fires on WidgetBot's dark shell; keep the skeleton until its ready message + grace. */}
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
