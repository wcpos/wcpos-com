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
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { FeatureCard } from '@/components/ui/feature-card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'

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
    pro: false,
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
            {feature.id === 'f2'
              ? t.rich('items.f2.description', {
                  link: (chunks) => (
                    <TextLink asChild>
                      <Link href="/extensions">{chunks}</Link>
                    </TextLink>
                  ),
                })
              : t(`items.${feature.id}.description`)}
          </FeatureCard>
        ))}
      </ul>
    </Section>
  )
}
