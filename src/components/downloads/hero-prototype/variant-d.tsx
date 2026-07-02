// PROTOTYPE — throwaway. Variant D: platform card grid.
// No single hero CTA — six equal cards, each with its own action; the
// detected platform's card is highlighted with a ring and badge. Free
// plugin is a slim full-width banner below the grid.
'use client'

import { Download, ArrowRight, Blocks } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import {
  PLATFORMS,
  type PlatformKey,
} from '@/components/downloads/download-picker'
import { useDetectedPlatform } from './use-detected-platform'
import { cn } from '@/lib/utils'

const GRID: { key: PlatformKey; label: string }[] = [
  { key: 'mac-arm', label: 'macOS' },
  { key: 'win', label: 'Windows' },
  { key: 'linux', label: 'Linux' },
  { key: 'ios', label: 'iOS & iPad' },
  { key: 'android', label: 'Android' },
  { key: 'web', label: 'Web' },
]

export function HeroVariantD({
  desktopVersion,
}: {
  desktopVersion: string | null
}) {
  const detectedRaw = useDetectedPlatform()
  const detected = detectedRaw === 'mac-intel' ? 'mac-arm' : detectedRaw

  return (
    <Section
      tone="none"
      spacing="hero"
      className="border-b bg-gradient-to-b from-muted/40 to-background"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Download WCPOS
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Free on every platform{desktopVersion ? ` · version ${desktopVersion}` : ''}
          , always in sync.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GRID.map(({ key, label }) => {
          const p = PLATFORMS[key]
          const Icon = p.icon
          const isDetected = key === detected
          const CtaIcon = p.kind === 'desktop' ? Download : ArrowRight
          return (
            <div
              key={key}
              className={cn(
                'relative flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-sm',
                isDetected && 'ring-2 ring-wcpos-red',
              )}
            >
              {isDetected && (
                <span className="absolute -top-2.5 rounded-full bg-wcpos-red px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
                  Your device
                </span>
              )}
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold tracking-tight">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.short}</p>
              <Button
                asChild
                variant={isDetected ? 'brand' : 'outline'}
                size="sm"
                className="mt-4 w-full"
              >
                <a href={p.href}>
                  <CtaIcon aria-hidden="true" />
                  {p.rowAction}
                </a>
              </Button>
              {key === 'mac-arm' && (
                <a
                  href={PLATFORMS['mac-intel'].href}
                  className="mt-2 text-xs font-medium text-wcpos-red-accent hover:underline"
                >
                  Intel build
                </a>
              )}
            </div>
          )
        })}
      </div>

      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-4">
        <p className="flex items-center gap-3 text-sm">
          <Blocks
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span>
            <span className="font-medium">First time?</span>{' '}
            <span className="text-muted-foreground">
              Install the free WordPress plugin — it&apos;s the foundation
              every app connects to.
            </span>
          </span>
        </p>
        <Button asChild variant="outline" size="sm">
          <a href="https://wordpress.org/plugins/woocommerce-pos/">
            Get the plugin
          </a>
        </Button>
      </div>
    </Section>
  )
}
