import { CtaBand } from '@/components/main/cta-band'

export function CtaSection() {
  return (
    <CtaBand
      title="Ready to sell in-store with WooCommerce?"
      subtitle="Try the live demo or download the free plugin to get started."
      actions={[
        { label: 'Try Live Demo', href: 'https://demo.wcpos.com/pos' },
        { label: 'Download Free', href: '/downloads', variant: 'inverse' },
      ]}
    />
  )
}
