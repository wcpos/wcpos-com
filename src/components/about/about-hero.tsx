import { useTranslations } from 'next-intl'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

export function AboutHero() {
  const t = useTranslations('about.hero')

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
          eyebrow={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
        />
      </Container>
    </Section>
  )
}
