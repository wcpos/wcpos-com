import { useTranslations } from 'next-intl'
import { CtaBand } from '@/components/main/cta-band'

export function CtaSection() {
  const t = useTranslations('home.cta')

  return (
    <CtaBand
      title={t('title')}
      subtitle={t('subtitle')}
      actions={[
        { label: t('liveDemo'), href: 'https://demo.wcpos.com/pos' },
        { label: t('download'), href: '/downloads', variant: 'inverse' },
      ]}
    />
  )
}
