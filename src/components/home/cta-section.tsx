import { useTranslations } from 'next-intl'
import { CtaBand } from '@/components/main/cta-band'

export function CtaSection({
  showCompareLink = true,
  home = false,
}: {
  showCompareLink?: boolean
  /** The homepage's own closing line: try the demo first, then download. */
  home?: boolean
}) {
  const t = useTranslations('home.cta')

  return (
    <CtaBand
      title={home ? t('homeTitle') : t('title')}
      subtitle={home ? t('homeSubtitle') : t('subtitle')}
      actions={[
        { label: t('liveDemo'), href: 'https://demo.wcpos.com/pos' },
        // the same white inverse as the hero's Download Free on the photo
        { label: t('download'), href: '/downloads', variant: 'inverse' },
      ]}
      link={showCompareLink ? { label: t('compare'), href: '/compare' } : undefined}
    />
  )
}
