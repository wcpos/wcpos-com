import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

export function AboutHero() {
  return (
    <Section tone="dark" spacing="hero" bare className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(148,163,184,0.18),transparent)]"
      />
      <Container className="relative">
        <SectionHeading
          as="h1"
          size="hero"
          tone="inverse"
          eyebrow="Our story"
          title="An independent point of sale for WooCommerce"
          subtitle="Built by a former shopkeeper, funded by shopkeepers — not investors. One developer, more than a decade of releases, still shipping."
        />
      </Container>
    </Section>
  )
}
