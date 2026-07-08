'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Download, ArrowRight } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { TextLink } from '@/components/ui/text-link'
import { trackClientEvent } from '@/lib/analytics/client-events'
import {
  PLATFORMS,
  tileFor,
  resolvePlatform,
  type PlatformKey,
} from '@/components/downloads/platforms'
import { cn } from '@/lib/utils'

const TILES: PlatformKey[] = ['mac-arm', 'win', 'linux', 'ios', 'android', 'web']
const subscribePlatform = () => () => {}

export function DownloadsHero({
  desktopVersion = null,
}: {
  desktopVersion?: string | null
}) {
  const t = useTranslations('downloads.hero')
  const platformT = useTranslations('downloads.platforms')
  const detected = useSyncExternalStore<PlatformKey>(
    subscribePlatform,
    () =>
      resolvePlatform(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints ?? 0,
      ),
    () => 'mac-arm',
  )

  const [picked, setPicked] = useState<PlatformKey | null>(null)
  const selected = picked ?? tileFor(detected)
  const isDetected = selected === tileFor(detected)

  const info = PLATFORMS[selected]
  const Icon = info.icon
  const PrimaryIcon = info.kind === 'desktop' ? Download : ArrowRight
  const platformName = platformT(`${selected}.name`)
  const platformShort = platformT(`${selected}.short`)
  const meta =
    info.kind === 'desktop' && desktopVersion
      ? t('versionMeta', { version: desktopVersion, platform: platformShort })
      : platformShort

  return (
    <Section
      tone="none"
      spacing="hero"
      className="border-b bg-gradient-to-b from-muted/40 to-background"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          {t('title')}
        </h1>

        <div
          role="group"
          aria-label={t('platformChooserLabel')}
          className="mt-10 flex flex-wrap justify-center gap-2"
        >
          {TILES.map((key) => {
            const TileIcon = PLATFORMS[key].icon
            const active = key === selected
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(key)}
                className={cn(
                  'flex w-24 flex-col items-center gap-2 rounded-lg border py-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-wcpos-red bg-wcpos-red/5 text-foreground ring-1 ring-wcpos-red'
                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <TileIcon className="h-6 w-6" aria-hidden="true" />
                {platformT(`${key}.name`)}
              </button>
            )
          })}
        </div>

        <Card aria-live="polite" className="mx-auto mt-6 max-w-xl p-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight">
              {platformName}
            </span>
            {isDetected && <Badge variant="brand-tint">{t('detected')}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          <Button asChild variant="brand" size="xl" className="mt-6 w-full">
            <a href={info.href}>
              <PrimaryIcon aria-hidden="true" />
              {platformT(`${selected}.action`)}
            </a>
          </Button>
          {selected === 'mac-arm' && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t.rich('intelMac', {
                intel: (chunks) => (
                  <TextLink href={PLATFORMS['mac-intel'].href}>{chunks}</TextLink>
                ),
              })}
            </p>
          )}
        </Card>

        <noscript>
          <ul className="mx-auto mt-6 max-w-xl space-y-2 text-left text-sm">
            {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => (
              <li key={key}>
                <TextLink href={PLATFORMS[key].href}>
                  {platformT(`${key}.name`)}
                </TextLink>{' '}
                <span className="text-muted-foreground">
                  {platformT(`${key}.short`)}
                </span>
              </li>
            ))}
          </ul>
        </noscript>

        <p className="mt-6 text-sm text-muted-foreground">
          {t.rich('pluginNotice', {
            plugin: (chunks) => (
              <TextLink
                href="https://wordpress.org/plugins/woocommerce-pos/"
                onClick={() =>
                  trackClientEvent('download_clicked', {
                    plugin: 'free',
                    source: 'wordpress_org',
                    page: '/downloads',
                  })
                }
              >
                {chunks}
              </TextLink>
            ),
          })}
        </p>
      </div>
    </Section>
  )
}
