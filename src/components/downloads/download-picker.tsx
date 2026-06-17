'use client'

import { useSyncExternalStore } from 'react'
import {
  Laptop,
  Smartphone,
  Globe,
  Download,
  ChevronDown,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PlatformKey =
  | 'mac-arm'
  | 'mac-intel'
  | 'win'
  | 'linux'
  | 'ios'
  | 'android'
  | 'web'

type Kind = 'desktop' | 'mobile' | 'web'

interface Platform {
  kind: Kind
  icon: LucideIcon
  name: string
  /** Word used in "Recommended for your …". */
  deviceWord: string
  /** Short descriptor shown after the version, e.g. "Apple Silicon · .dmg". */
  short: string
  href: string
  /** Primary button label. */
  action: string
  /** Label for the row in the "other platforms" list. */
  rowAction: string
}

const ELECTRON = (slug: string) =>
  `https://updates.wcpos.com/v1/electron/download/${slug}`

const PLATFORMS: Record<PlatformKey, Platform> = {
  'mac-arm': {
    kind: 'desktop',
    icon: Laptop,
    name: 'macOS',
    deviceWord: 'Mac',
    short: 'Apple Silicon · .dmg',
    href: ELECTRON('darwin-arm64'),
    action: 'Download for macOS',
    rowAction: 'Download',
  },
  'mac-intel': {
    kind: 'desktop',
    icon: Laptop,
    name: 'macOS (Intel)',
    deviceWord: 'Mac',
    short: 'Intel · .dmg',
    href: ELECTRON('darwin-x64'),
    action: 'Download for macOS',
    rowAction: 'Download',
  },
  win: {
    kind: 'desktop',
    icon: Laptop,
    name: 'Windows',
    deviceWord: 'Windows PC',
    short: 'Windows 10/11 · .exe',
    href: ELECTRON('win32-x64'),
    action: 'Download for Windows',
    rowAction: 'Download',
  },
  linux: {
    kind: 'desktop',
    icon: Laptop,
    name: 'Linux',
    deviceWord: 'Linux machine',
    short: '.AppImage',
    href: ELECTRON('linux-x64'),
    action: 'Download for Linux',
    rowAction: 'Download',
  },
  ios: {
    kind: 'mobile',
    icon: Smartphone,
    name: 'iOS & iPad',
    deviceWord: 'iPhone or iPad',
    short: 'Public TestFlight beta',
    href: 'https://testflight.apple.com/join/JGBdVRrW',
    action: 'Join the iOS beta',
    rowAction: 'Join beta',
  },
  android: {
    kind: 'mobile',
    icon: Smartphone,
    name: 'Android',
    deviceWord: 'Android device',
    short: 'Google Play testing beta',
    href: 'https://play.google.com/apps/testing/com.wcpos.main',
    action: 'Join the Android beta',
    rowAction: 'Join beta',
  },
  web: {
    kind: 'web',
    icon: Globe,
    name: 'Web',
    deviceWord: 'browser',
    short: 'No install needed',
    href: 'https://demo.wcpos.com/pos',
    action: 'Open the web demo',
    rowAction: 'Open',
  },
}

/** Order the "other platforms" list is rendered in. */
const ORDER: PlatformKey[] = [
  'mac-arm',
  'mac-intel',
  'win',
  'linux',
  'ios',
  'android',
  'web',
]

/**
 * Map a browser environment to the best-fit platform. Pure so it can be
 * unit-tested without a DOM.
 */
export function resolvePlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): PlatformKey {
  const ua = userAgent || ''
  const p = platform || ''
  // iPadOS 13+ reports as "MacIntel" with touch points — treat as iOS.
  if (/iPhone|iPod/i.test(ua) || /iPad/i.test(ua) || (/Mac/i.test(p) && maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  if (/Win/i.test(p) || /Windows/i.test(ua)) return 'win'
  if (/Linux/i.test(p) && !/Android/i.test(ua)) return 'linux'
  if (/Mac/i.test(p)) return 'mac-arm'
  return 'mac-arm'
}

/** Platform never changes within a session, so the store never emits. */
const subscribePlatform = () => () => {}

function metaLine(p: Platform, version: string | null): string {
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
                  <span className="text-xs text-muted-foreground">{other.short}</span>
                </span>
                <a
                  href={other.href}
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 font-medium text-wcpos-red-accent hover:underline',
                  )}
                >
                  {other.rowAction}
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
