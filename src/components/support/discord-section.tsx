'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { TextLink } from '@/components/ui/text-link'
import { DISCORD_INVITE_URL } from '@/lib/discord-invite'

const DiscordWidget = dynamic(
  () => import('@/components/support/discord-widget').then((m) => m.DiscordWidget),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full" />,
  }
)

export function DiscordSection() {
  const t = useTranslations('support.discord')
  const [inView, setInView] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // WidgetBot's ~2.8 MB embed mounts near the viewport; the box stays 600px so nothing shifts.
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setInView(true); io.disconnect() } }, { rootMargin: '200px 0px' })
    if (boxRef.current) io.observe(boxRef.current)
    return () => io.disconnect()
  }, [])

  return (
    <Section id="discord" spacing="default">
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <h2 id="discord-chat-title" className="mb-2 text-2xl font-bold text-foreground">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
            {t('open')}
          </a>
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          {t.rich('emailLine', {
            email: (chunks) => <TextLink href="mailto:support@wcpos.com">{chunks}</TextLink>,
          })}
        </p>
      </div>
      <div ref={boxRef} role="region" aria-labelledby="discord-chat-title" className="mx-auto h-[600px] max-w-3xl overflow-hidden rounded-md border">
        {inView ? <DiscordWidget /> : <Skeleton className="h-full w-full" />}
      </div>
    </Section>
  )
}
