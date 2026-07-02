import {
  Laptop,
  Smartphone,
  Globe,
  type LucideIcon,
} from 'lucide-react'

export type PlatformKey =
  | 'mac-arm'
  | 'mac-intel'
  | 'win'
  | 'linux'
  | 'ios'
  | 'android'
  | 'web'

export type Kind = 'desktop' | 'mobile' | 'web'

export interface Platform {
  kind: Kind
  icon: LucideIcon
  name: string
  /** Short descriptor shown after the version, e.g. "Apple Silicon · .dmg". */
  short: string
  href: string
  /** Primary button label. */
  action: string
  /** Label for a compact row/list action. */
  rowAction: string
}

const ELECTRON = (slug: string) =>
  `https://updates.wcpos.com/v1/electron/download/${slug}`

export const PLATFORMS: Record<PlatformKey, Platform> = {
  'mac-arm': {
    kind: 'desktop',
    icon: Laptop,
    name: 'macOS',
    short: 'Apple Silicon · .dmg',
    href: ELECTRON('darwin-arm64'),
    action: 'Download for macOS',
    rowAction: 'Download',
  },
  'mac-intel': {
    kind: 'desktop',
    icon: Laptop,
    name: 'macOS (Intel)',
    short: 'Intel · .dmg',
    href: ELECTRON('darwin-x64'),
    action: 'Download for macOS',
    rowAction: 'Download',
  },
  win: {
    kind: 'desktop',
    icon: Laptop,
    name: 'Windows',
    short: 'Windows 10/11 · .exe',
    href: ELECTRON('win32-x64'),
    action: 'Download for Windows',
    rowAction: 'Download',
  },
  linux: {
    kind: 'desktop',
    icon: Laptop,
    name: 'Linux',
    short: '.AppImage',
    href: ELECTRON('linux-x64'),
    action: 'Download for Linux',
    rowAction: 'Download',
  },
  ios: {
    kind: 'mobile',
    icon: Smartphone,
    name: 'iOS & iPad',
    short: 'Public TestFlight beta',
    href: 'https://testflight.apple.com/join/JGBdVRrW',
    action: 'Join the iOS beta',
    rowAction: 'Join beta',
  },
  android: {
    kind: 'mobile',
    icon: Smartphone,
    name: 'Android',
    short: 'Google Play testing beta',
    href: 'https://play.google.com/apps/testing/com.wcpos.main',
    action: 'Join the Android beta',
    rowAction: 'Join beta',
  },
  web: {
    kind: 'web',
    icon: Globe,
    name: 'Web',
    short: 'No install needed',
    href: 'https://demo.wcpos.com/pos',
    action: 'Open the web demo',
    rowAction: 'Open',
  },
}

/** Order platforms are listed in wherever all of them are shown. */
export const ORDER: PlatformKey[] = [
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
