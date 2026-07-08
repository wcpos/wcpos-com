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

type Kind = 'desktop' | 'mobile' | 'web'

interface Platform {
  kind: Kind
  icon: LucideIcon
  href: string
}

const ELECTRON = (slug: string) =>
  `https://updates.wcpos.com/v1/electron/download/${slug}`

export const PLATFORMS: Record<PlatformKey, Platform> = {
  'mac-arm': { kind: 'desktop', icon: Laptop, href: ELECTRON('darwin-arm64') },
  'mac-intel': { kind: 'desktop', icon: Laptop, href: ELECTRON('darwin-x64') },
  win: { kind: 'desktop', icon: Laptop, href: ELECTRON('win32-x64') },
  linux: { kind: 'desktop', icon: Laptop, href: ELECTRON('linux-x64') },
  ios: { kind: 'mobile', icon: Smartphone, href: 'https://testflight.apple.com/join/JGBdVRrW' },
  android: { kind: 'mobile', icon: Smartphone, href: 'https://play.google.com/apps/testing/com.wcpos.main' },
  web: { kind: 'web', icon: Globe, href: 'https://demo.wcpos.com/pos' },
}

/**
 * The tile a detected platform maps to — the two mac builds share one macOS
 * tile because browsers can't reliably tell Apple Silicon from Intel.
 */
export function tileFor(key: PlatformKey): PlatformKey {
  return key === 'mac-intel' ? 'mac-arm' : key
}

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
