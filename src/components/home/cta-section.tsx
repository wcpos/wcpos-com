import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

export function CtaSection() {
  return (
    <Section tone="dark" spacing="default" containerClassName="text-center">
      <SectionHeading
        tone="inverse"
        title="Ready to sell in-store with WooCommerce?"
        subtitle="Try the live demo or download the free plugin to get started."
      />
      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <Button
          asChild
          variant="brand"
          size="xl"
          className="focus-visible:ring-white focus-visible:ring-offset-transparent"
        >
          <a href="https://demo.wcpos.com/pos">Try Live Demo</a>
        </Button>
        <Button asChild variant="inverse" size="xl">
          <a href="https://wordpress.org/plugins/woocommerce-pos/">
            Download Free
          </a>
        </Button>
      </div>
    </Section>
  )
}
