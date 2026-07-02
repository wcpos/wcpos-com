'use client'

import { useState, useSyncExternalStore } from 'react'
import { Download, ArrowRight } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { TextLink } from '@/components/ui/text-link'
import {
  PLATFORMS,
  tileFor,
  resolvePlatform,
  type PlatformKey,
} from '@/components/downloads/platforms'
import { cn } from '@/lib/utils'

/**
 * One tile per device family — the two mac builds share the macOS tile
 * (browsers can't reliably tell Apple Silicon from Intel, so the Intel build
 * is a secondary link in the panel; `tileFor` owns that collapse).
 */
const TILES: PlatformKey[] = [
  'mac-arm',
  'win',
  'linux',
  'ios',
  'android',
  'web',
]

/** Platform never changes within a session, so the store never emits. */
const subscribePlatform = () => () => {}

export function DownloadsHero({
  desktopVersion = null,
}: {
  desktopVersion?: string | null
}) {
  // Server renders a desktop default; the client reads the real platform.
  // useSyncExternalStore keeps SSR and hydration consistent without a
  // setState-in-effect (the store is read-only and never emits).
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

  // Until the visitor picks a tile, the selection follows the detected
  // platform (derived, so SSR and hydration stay consistent).
  const [picked, setPicked] = useState<PlatformKey | null>(null)
  const selected = picked ?? tileFor(detected)
  const isDetected = selected === tileFor(detected)

  const info = PLATFORMS[selected]
  const Icon = info.icon
  const PrimaryIcon = info.kind === 'desktop' ? Download : ArrowRight
  const meta =
    info.kind === 'desktop' && desktopVersion
      ? `Version ${desktopVersion} · ${info.short}`
      : info.short

  return (
    <Section
      tone="none"
      spacing="hero"
      className="border-b bg-gradient-to-b from-muted/40 to-background"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Downloads</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          One till, every device.
        </h1>

        <div
          role="group"
          aria-label="Choose your platform"
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
                {PLATFORMS[key].name}
              </button>
            )
          })}
        </div>

        <Card aria-live="polite" className="mx-auto mt-6 max-w-xl p-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight">
              {info.name}
            </span>
            {isDetected && (
              <span className="rounded bg-wcpos-red/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wcpos-red-accent">
                Detected
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          <Button asChild variant="brand" size="xl" className="mt-6 w-full">
            <a href={info.href}>
              <PrimaryIcon aria-hidden="true" />
              {info.action}
            </a>
          </Button>
          {selected === 'mac-arm' && (
            <p className="mt-3 text-xs text-muted-foreground">
              On an Intel Mac?{' '}
              <TextLink href={PLATFORMS['mac-intel'].href}>
                Get the Intel build
              </TextLink>
            </p>
          )}
        </Card>

        {/* The tiles need JS; without it, list every build so no platform is
            unreachable from the hero. */}
        <noscript>
          <ul className="mx-auto mt-6 max-w-xl space-y-2 text-left text-sm">
            {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => (
              <li key={key}>
                <TextLink href={PLATFORMS[key].href}>
                  {PLATFORMS[key].name}
                </TextLink>{' '}
                <span className="text-muted-foreground">
                  {PLATFORMS[key].short}
                </span>
              </li>
            ))}
          </ul>
        </noscript>

        <p className="mt-6 text-sm text-muted-foreground">
          Every app connects to the{' '}
          <TextLink href="https://wordpress.org/plugins/woocommerce-pos/">
            free WordPress plugin
          </TextLink>{' '}
          — install it first.
        </p>
      </div>
    </Section>
  )
}
