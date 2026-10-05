'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { DiscordIcon } from '@/components/icons/discord'
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
  const [open, setOpen] = useState(false)

  return (
    <Section id="discord" spacing="default">
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>
      <div className="mx-auto h-[600px] max-w-3xl overflow-hidden rounded-md border">
        {open ? (
          <DiscordWidget />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <DiscordIcon aria-hidden="true" className="size-12 text-[#5865F2]" />
            <Button type="button" onClick={() => setOpen(true)}>{t('open')}</Button>
            <p className="max-w-sm text-sm text-muted-foreground">{t('notice')}</p>
          </div>
        )}
      </div>
    </Section>
  )
}
