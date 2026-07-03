import { CtaBand } from '@/components/main/cta-band'

export function AboutCta() {
  return (
    <CtaBand
      title="Built by a shopkeeper. Funded by shopkeepers."
      subtitle="Try the live demo, download the free plugin, or see what Pro adds — and what keeps it all going."
      actions={[
        { label: 'Try Live Demo', href: 'https://demo.wcpos.com/pos' },
        {
          label: 'Download Free',
          href: 'https://wordpress.org/plugins/woocommerce-pos/',
          variant: 'inverse',
        },
        { label: 'See Pro', href: '/pro', variant: 'brand-outline' },
      ]}
    />
  )
}
