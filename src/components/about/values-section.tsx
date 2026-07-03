import { Compass, HeartHandshake, Code2, ShieldCheck } from 'lucide-react'
import { FeatureCard } from '@/components/ui/feature-card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const values = [
  {
    icon: Compass,
    title: 'Independent',
    body: 'No investors, no acquisition exit waiting. The roadmap answers to the shopkeepers using it — not a board.',
  },
  {
    icon: HeartHandshake,
    title: 'Funded by Pro',
    body: 'Pro tools fund every release, free ones included. Shopkeepers pay for it directly, and that keeps the free version free.',
  },
  {
    icon: Code2,
    title: 'Open & GPL',
    body: 'Released on WordPress.org under the GPL. Yours to use, inspect, and keep — wherever WooCommerce runs.',
  },
  {
    icon: ShieldCheck,
    title: 'A fair licence',
    body: 'If a Pro licence lapses, Pro keeps working — you just stop getting updates. Nothing you rely on gets switched off.',
  },
]

export function ValuesSection() {
  return (
    <Section tone="muted" spacing="default">
      <SectionHeading className="mb-12" title="What it stands for" />
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
        {values.map((value) => (
          <FeatureCard
            key={value.title}
            icon={value.icon}
            iconStyle="plain"
            title={value.title}
          >
            {value.body}
          </FeatureCard>
        ))}
      </div>
    </Section>
  )
}
