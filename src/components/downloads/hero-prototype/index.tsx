// PROTOTYPE — throwaway. Four hero variants for /downloads, switchable via
// ?variant= on the existing route (plus `original` for comparison). Once a
// winner is picked, fold it into page.tsx and delete this folder.
import { HeroVariantA } from './variant-a'
import { HeroVariantB } from './variant-b'
import { HeroVariantC } from './variant-c'
import { HeroVariantD } from './variant-d'
import { PrototypeSwitcher } from './switcher'

export const HERO_VARIANTS = ['a', 'b', 'c', 'd', 'original'] as const
export type HeroVariant = (typeof HERO_VARIANTS)[number]

export const HERO_VARIANT_LABELS: Record<HeroVariant, string> = {
  a: 'Craft-style grouped cards',
  b: 'Selector tiles + panel',
  c: 'Utilitarian table',
  d: 'Platform card grid',
  original: 'Current hero',
}

export function resolveHeroVariant(raw: string | undefined): HeroVariant {
  return HERO_VARIANTS.includes(raw as HeroVariant)
    ? (raw as HeroVariant)
    : 'a'
}

export function DownloadsHeroPrototype({
  variant,
  desktopVersion,
  freeVersion,
}: {
  variant: HeroVariant
  desktopVersion: string | null
  freeVersion: string | null
}) {
  return (
    <>
      {variant === 'a' && <HeroVariantA desktopVersion={desktopVersion} />}
      {variant === 'b' && <HeroVariantB desktopVersion={desktopVersion} />}
      {variant === 'c' && (
        <HeroVariantC
          desktopVersion={desktopVersion}
          freeVersion={freeVersion}
        />
      )}
      {variant === 'd' && <HeroVariantD desktopVersion={desktopVersion} />}
      <PrototypeSwitcher
        variants={[...HERO_VARIANTS]}
        current={variant}
        labels={HERO_VARIANT_LABELS}
      />
    </>
  )
}
