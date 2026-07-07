import { useTranslations } from 'next-intl'
import {
  BarChart3,
  PencilLine,
  Receipt,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FeatureCard } from '@/components/ui/feature-card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

type FeatureId = 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6'

interface Feature {
  icon: LucideIcon
  id: FeatureId
  pro: boolean
}

const features: Feature[] = [
  {
    icon: Search,
    id: 'f1',
    pro: false,
  },
  {
    icon: ShoppingCart,
    id: 'f2',
    pro: true,
  },
  {
    icon: Users,
    id: 'f3',
    pro: true,
  },
  {
    icon: Receipt,
    id: 'f4',
    pro: true,
  },
  {
    icon: PencilLine,
    id: 'f5',
    pro: true,
  },
  {
    icon: BarChart3,
    id: 'f6',
    pro: true,
  },
]

export function FeaturesSection() {
  const t = useTranslations('home.features')

  return (
    <Section tone="default" spacing="default">
      <SectionHeading
        className="mb-12"
        title={t('heading')}
      />

      <ul className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            as="li"
            icon={feature.icon}
            title={t(`items.${feature.id}.title`)}
            badge={feature.pro && <Badge variant="pro">Pro</Badge>}
          >
            {t(`items.${feature.id}.description`)}
          </FeatureCard>
        ))}
      </ul>
    </Section>
  )
}
