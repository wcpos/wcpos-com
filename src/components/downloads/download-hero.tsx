'use client'

import { useState, useSyncExternalStore } from 'react'
import { Download, ArrowRight } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import {
  PLATFORMS,
  resolvePlatform,
  type PlatformKey,
} from '@/components/downloads/platforms'
import { cn } from '@/lib/utils'

/**
 * Tiles collapse the two mac builds into one; browsers can't reliably tell
 * Apple Silicon from Intel, so the Intel build is a secondary link in the
 * panel instead.
 */
const TILES: { key: PlatformKey; label: string }[] = [
  { key: 'mac-arm', label: 'macOS' },
  { key: 'win', label: 'Windows' },
  { key: 'linux', label: 'Linux' },
  { key: 'ios', label: 'iOS & iPad' },
  { key: 'android', label: 'Android' },
  { key: 'web', label: 'Web' },
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
  const selected = picked ?? (detected === 'mac-intel' ? 'mac-arm' : detected)

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
        <p className="text-sm font-semibold uppercase tracking-wider text-wcpos-red dark:text-wcpos-red-accent">
          Downloads
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          One till, every device.
        </h1>

        <div
          role="group"
          aria-label="Choose your platform"
          className="mt-10 flex flex-wrap justify-center gap-2"
        >
          {TILES.map(({ key, label }) => {
            const TileIcon = PLATFORMS[key].icon
            const active = key === selected
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(key)}
                className={cn(
                  'flex w-24 flex-col items-center gap-2 rounded-xl border py-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-wcpos-red bg-wcpos-red/5 text-foreground ring-1 ring-wcpos-red'
                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <TileIcon className="h-6 w-6" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>

        <div className="mx-auto mt-6 max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight">
              {info.name}
            </span>
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
              <a
                href={PLATFORMS['mac-intel'].href}
                className="font-medium text-wcpos-red-accent hover:underline"
              >
                Get the Intel build
              </a>
            </p>
          )}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Every app connects to the{' '}
          <a
            href="https://wordpress.org/plugins/woocommerce-pos/"
            className="font-medium text-wcpos-red-accent hover:underline"
          >
            free WordPress plugin
          </a>{' '}
          — install it first.
        </p>
      </div>
    </Section>
  )
}
