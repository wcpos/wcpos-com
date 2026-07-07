import { useTranslations } from 'next-intl'
import { Compass, HeartHandshake, Code2, ShieldCheck } from 'lucide-react'
import { FeatureCard } from '@/components/ui/feature-card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const values = [
  { icon: Compass, id: 'v1' },
  { icon: HeartHandshake, id: 'v2' },
  { icon: Code2, id: 'v3' },
  { icon: ShieldCheck, id: 'v4' },
] as const

export function ValuesSection() {
  const t = useTranslations('about.values')

  return (
    <Section tone="muted" spacing="default">
      <SectionHeading className="mb-12" title={t('heading')} />
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
        {values.map((value) => (
          <FeatureCard
            key={value.id}
            icon={value.icon}
            iconStyle="plain"
            title={t(`items.${value.id}.title`)}
          >
            {t(`items.${value.id}.body`)}
          </FeatureCard>
        ))}
      </div>
    </Section>
  )
}
