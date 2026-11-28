'use client'

import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'

/** The Discord embed's place-holder: a skeleton with a quiet "Loading Discord…" over it. */
export function DiscordLoading({ className }: { className?: string }) {
  const t = useTranslations('support.discord')
  return (
    <div className={className ?? 'relative h-full w-full'}>
      <Skeleton
        aria-hidden
        data-testid="discord-widget-skeleton"
        className="pointer-events-none absolute inset-0 h-full w-full rounded-none"
      />
      <p
        role="status"
        className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground"
      >
        {t('loading')}
      </p>
    </div>
  )
}
