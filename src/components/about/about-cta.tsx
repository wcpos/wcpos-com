import { useTranslations } from 'next-intl'
import { CtaBand } from '@/components/main/cta-band'

export function AboutCta() {
  const t = useTranslations('about.cta')

  return (
    <CtaBand
      title={t('title')}
      subtitle={t('subtitle')}
      actions={[
        {
          label: t('actions.download'),
          href: 'https://wordpress.org/plugins/woocommerce-pos/',
        },
        {
          label: t('actions.demo'),
          href: 'https://demo.wcpos.com/pos',
          variant: 'brand-outline',
        },
        { label: t('actions.pro'), href: '/pro', variant: 'brand-outline' },
      ]}
    />
  )
}
