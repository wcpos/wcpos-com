'use client'

import { useSyncExternalStore } from 'react'
import { Download, ChevronDown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PLATFORMS,
  resolvePlatform,
  type PlatformKey,
} from '@/components/downloads/platforms'
import { cn } from '@/lib/utils'

const ORDER: PlatformKey[] = [
  'mac-arm',
  'mac-intel',
  'win',
  'linux',
  'ios',
  'android',
  'web',
]

const ROW_ACTIONS: Record<(typeof PLATFORMS)[PlatformKey]['kind'], string> = {
  desktop: 'Download',
  mobile: 'Join beta',
  web: 'Open',
}

/** Platform never changes within a session, so the store never emits. */
const subscribePlatform = () => () => {}

function metaLine(
  p: (typeof PLATFORMS)[PlatformKey],
  version: string | null,
): string {
  if (p.kind === 'desktop') {
    return version
      ? `Desktop app · version ${version} · ${p.short}`
      : `Desktop app · ${p.short}`
  }
  return p.short
}

export function DownloadPicker({
  desktopVersion = null,
}: {
  desktopVersion?: string | null
}) {
  // Server renders a desktop default; the client reads the real platform.
  // useSyncExternalStore keeps SSR and hydration consistent without a
  // setState-in-effect (the store is read-only and never emits).
  const current = useSyncExternalStore<PlatformKey>(
    subscribePlatform,
    () =>
      resolvePlatform(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints ?? 0,
      ),
    () => 'mac-arm',
  )

  const info = PLATFORMS[current]
  const Icon = info.icon
  const PrimaryIcon = info.kind === 'desktop' ? Download : ArrowRight

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
      <p className="mb-5 text-sm text-muted-foreground">
        Recommended for your {info.deviceWord}
      </p>

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">{info.name}</div>
          <div className="text-sm text-muted-foreground">
            {metaLine(info, desktopVersion)}
          </div>
        </div>
      </div>

      <Button asChild variant="brand" size="lg" className="w-full">
        <a href={info.href}>
          <PrimaryIcon aria-hidden="true" />
          {info.action}
        </a>
      </Button>

      {current === 'mac-arm' && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          On an Intel Mac?{' '}
          <a
            href={PLATFORMS['mac-intel'].href}
            className="font-medium text-wcpos-red-accent hover:underline"
          >
            Get the Intel build
          </a>
        </p>
      )}

      <details className="group mt-5 border-t pt-1">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          Other platforms
          <ChevronDown
            className="h-4 w-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="pb-1">
          {ORDER.filter((key) => key !== current).map((key) => {
            const other = PLATFORMS[key]
            const RowIcon = other.icon
            return (
              <li
                key={key}
                className="flex items-center gap-3 border-t py-2.5 text-sm first:border-t-0"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <RowIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="font-medium">{other.name}</span>{' '}
                  <span className="text-xs text-muted-foreground">
                    {other.short}
                  </span>
                </span>
                <a
                  href={other.href}
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 font-medium text-wcpos-red-accent hover:underline',
                  )}
                >
                  {ROW_ACTIONS[other.kind]}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ul>
      </details>
    </div>
  )
}
