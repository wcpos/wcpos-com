import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

export function AboutCta() {
  return (
    <Section tone="dark" spacing="default" containerClassName="text-center">
      <SectionHeading
        tone="inverse"
        title="Built by a shopkeeper. Funded by shopkeepers."
        subtitle="Try the live demo, download the free plugin, or see what Pro adds — and what keeps it all going."
      />
      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <Button asChild variant="brand-on-dark" size="xl">
          <a href="https://demo.wcpos.com/pos">
            Try Live Demo
          </a>
        </Button>
        <Button asChild variant="inverse" size="xl">
          <a href="https://wordpress.org/plugins/woocommerce-pos/">
            Download Free
          </a>
        </Button>
        <Button asChild variant="brand-outline" size="xl">
          <Link href="/pro">See Pro</Link>
        </Button>
      </div>
    </Section>
  )
}
