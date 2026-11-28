'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Download, ArrowRight, TriangleAlert } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextLink } from '@/components/ui/text-link'
import {
  MACOS12_DESKTOP,
  PLATFORMS,
  WEB_SETUP_GUIDE_URL,
  tileFor,
  resolvePlatform,
  type PlatformKey,
} from '@/components/downloads/platforms'
import { cn } from '@/lib/utils'

const TILES: PlatformKey[] = ['mac-arm', 'win', 'linux', 'ios', 'android', 'web']
// Every build, for the "could not tell which device" list (web has nothing to download).
const BUILDS: PlatformKey[] = ['mac-arm', 'mac-intel', 'win', 'linux', 'ios', 'android']
// The 1.11 → 2.0 upgrade notice points at the 2.0.0 notes on GitHub, which outlive the page's six-release list.
const NOTES_2_0_URL = 'https://github.com/wcpos/woocommerce-pos/releases/tag/v2.0.0'
const subscribePlatform = () => () => {}

/** Step 2 of the install guide: the platform tiles, the chosen build and its download. */
export function PlatformPicker({
  desktopVersion = null,
}: {
  desktopVersion?: string | null
}) {
  const t = useTranslations('downloads.hero')
  const platformT = useTranslations('downloads.platforms')
  const pageT = useTranslations('downloads.page')
  const detected = useSyncExternalStore<PlatformKey | null>(
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
  const auto = detected && tileFor(detected)
  const selected = picked ?? auto
  const info = selected && PLATFORMS[selected]
  const PrimaryIcon = info?.kind === 'desktop' ? Download : ArrowRight
  const meta = (key: PlatformKey) =>
    PLATFORMS[key].kind === 'desktop' && desktopVersion
      ? t('versionMeta', { version: desktopVersion, platform: platformT(`${key}.short`) })
      : platformT(`${key}.short`)

  return (
    <>
      <div
        role="group"
        aria-label={t('platformChooserLabel')}
        className="mt-2 grid grid-cols-3 gap-1.5 md:mt-3.5 md:flex md:gap-2"
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
                'flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-1 py-2 text-[13px] font-medium transition-colors md:flex-1 md:flex-col md:gap-2 md:py-4 md:text-sm',
                active
                  ? 'border-wcpos-red bg-wcpos-red/5 text-foreground ring-1 ring-wcpos-red'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <TileIcon className="size-4 md:size-6" aria-hidden="true" />
              {platformT(`${key}.name`)}
            </button>
          )
        })}
      </div>

      <div aria-live="polite" className="mt-2.5 space-y-2 md:mt-3 md:space-y-3">
        {selected ? (
          <div>
            <p className="flex flex-wrap items-center gap-2.5 text-lg font-semibold tracking-tight">
              {platformT(`${selected}.name`)}
              {selected === auto && <Badge variant="brand-tint">{t('detected')}</Badge>}
              {info?.kind === 'mobile' && <Badge variant="muted-tint">{pageT('beta')}</Badge>}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {meta(selected)
                .split(' · ')
                .map((part, index) => (
                  <span key={part}>
                    {index > 0 && ' · '}
                    <span className="whitespace-nowrap">{part}</span>
                  </span>
                ))}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold">{t('pickTitle')}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('pickBody')}</p>
            <ul className="mt-3 border-t">
              {BUILDS.map((key) => (
                <li key={key} className="flex justify-between gap-3 border-b py-2.5 text-sm">
                  <TextLink href={PLATFORMS[key].href}>{platformT(`${key}.listLabel`)}</TextLink>
                  <span className="text-right text-muted-foreground">{meta(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Alert tone="caution" icon={<TriangleAlert />} data-testid="upgrade-note">
          <p>
            {t.rich('upgradeNote', {
              title: (chunks) => <span className="font-medium">{chunks}</span>,
              notes: (chunks) => (
                <a
                  href={NOTES_2_0_URL}
                  className="font-medium underline underline-offset-2 hover:no-underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </Alert>

        {selected && info && (
          <div className="flex flex-col-reverse gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1 space-y-1 text-[13px] text-muted-foreground empty:hidden">
              {selected === 'mac-arm' && (
                <>
                  <p>
                    {t.rich('intelMac', {
                      intel: (chunks) => (
                        <TextLink href={PLATFORMS['mac-intel'].href}>{chunks}</TextLink>
                      ),
                    })}
                  </p>
                  <p>
                    {t.rich('macos12', {
                      version: MACOS12_DESKTOP.version,
                      arm: (chunks) => <TextLink href={MACOS12_DESKTOP.arm}>{chunks}</TextLink>,
                      intel: (chunks) => <TextLink href={MACOS12_DESKTOP.intel}>{chunks}</TextLink>,
                    })}
                  </p>
                </>
              )}
              {selected === 'ios' && <p>{t('iosNote')}</p>}
              {selected === 'web' && (
                <p>
                  {t.rich('webNote', {
                    demo: (chunks) => <TextLink href={PLATFORMS.web.href}>{chunks}</TextLink>,
                  })}
                </p>
              )}
            </div>
            <Button asChild variant="brand" size="xl" className="w-full lg:w-auto">
              <a href={selected === 'web' ? WEB_SETUP_GUIDE_URL : info.href}>
                <PrimaryIcon aria-hidden="true" />
                {platformT(`${selected}.action`)}
              </a>
            </Button>
          </div>
        )}
      </div>

      <noscript>
        <ul className="mt-6 space-y-2 text-sm">
          {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => (
            <li key={key}>
              <TextLink href={PLATFORMS[key].href}>{platformT(`${key}.name`)}</TextLink>{' '}
              <span className="text-muted-foreground">{platformT(`${key}.short`)}</span>
            </li>
          ))}
        </ul>
      </noscript>
    </>
  )
}
