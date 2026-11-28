'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { DiscordIcon } from '@/components/icons/discord'
import { Button } from '@/components/ui/button'
import { TextLink } from '@/components/ui/text-link'
import { DiscordLoading } from '@/components/support/discord-loading'
import { DISCORD_INVITE_URL } from '@/lib/discord-invite'
import { cn } from '@/lib/utils'

/** The outline Button on a card or muted surface: a transparent fill so its edge shows on both. */
export const OUTLINE_ON_SURFACE =
  'bg-transparent border-foreground/15 hover:bg-transparent hover:border-foreground/20'

const DiscordWidget = dynamic(
  () => import('@/components/support/discord-widget').then((m) => m.DiscordWidget),
  {
    ssr: false,
    loading: () => <DiscordLoading />,
  }
)

/**
 * The person panel: heading, Open Discord, email, and the live channel.
 * From lg up it is one sticky panel in the right lane; below lg it dissolves
 * (`contents`) so the card and the widget take their own places in the
 * page's single column (see SupportLanes).
 */
export function DiscordSection({ className }: { className?: string }) {
  const t = useTranslations('support.discord')
  const [inView, setInView] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // WidgetBot's ~2.8 MB embed mounts near the viewport; the box keeps its fixed height so nothing shifts.
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setInView(true); io.disconnect() } }, { rootMargin: '200px 0px' })
    if (boxRef.current) io.observe(boxRef.current)
    return () => io.disconnect()
  }, [])

  return (
    <div className={cn('max-lg:contents lg:sticky lg:top-22', className)}>
      <aside className="overflow-hidden rounded-md border bg-card max-lg:contents">
        <div
          id="discord"
          className="scroll-mt-22 p-6 max-lg:order-2 max-lg:mt-6 max-lg:rounded-md max-lg:border max-lg:p-5"
        >
          <h2 id="discord-chat-title" className="flex items-center gap-2.5 text-xl font-bold text-foreground">
            <DiscordIcon aria-hidden="true" className="size-5.5 shrink-0" />
            {t('title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t('subtitle')}
            <span className="max-lg:hidden"> {t('subtitlePro')}</span>
          </p>
          <Button asChild variant="outline" className={cn('mt-4.5', OUTLINE_ON_SURFACE)}>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
              {t('open')}
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
          <p className="mt-3.5 text-sm text-muted-foreground">
            {t.rich('emailLine', {
              email: (chunks) => (
                <TextLink href="mailto:support@wcpos.com" className="underline underline-offset-2">
                  {chunks}
                </TextLink>
              ),
            })}
          </p>
        </div>
        <p className="mt-12 mb-3 text-xl font-bold text-foreground max-lg:order-4 lg:hidden">
          {t('liveCaption')}
        </p>
        <div
          ref={boxRef}
          role="region"
          aria-labelledby="discord-chat-title"
          className="h-[300px] border-t max-lg:order-5 max-lg:h-[480px] max-lg:min-w-0 max-lg:overflow-hidden max-lg:rounded-md max-lg:border"
        >
          {inView ? <DiscordWidget /> : <DiscordLoading />}
        </div>
      </aside>
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground max-lg:order-6">
        <DiscordIcon aria-hidden="true" className="size-3 shrink-0" />
        {t('channelCaption')}
      </p>
    </div>
  )
}
