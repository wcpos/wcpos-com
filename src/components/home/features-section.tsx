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

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  pro: boolean
}

const features: Feature[] = [
  {
    icon: Search,
    title: 'Fast product search',
    description:
      'Find products instantly with search, filters, and category browsing. Barcode scanner support.',
    pro: false,
  },
  {
    icon: ShoppingCart,
    title: 'Smooth checkout flow',
    description:
      'Add items, apply discounts, choose payment method. Supports Stripe Terminal, SumUp, cash, and custom gateways.',
    pro: true,
  },
  {
    icon: Users,
    title: 'Customer profiles',
    description:
      'Add and edit customer info directly in the POS. Track regulars, offer better service.',
    pro: true,
  },
  {
    icon: Receipt,
    title: 'Order history & management',
    description:
      'View past orders, process returns, check order status without switching to WP Admin.',
    pro: true,
  },
  {
    icon: PencilLine,
    title: 'Edit stock & prices on the fly',
    description:
      'Fix a wrong price while serving a customer. Adjust stock without leaving the POS.',
    pro: true,
  },
  {
    icon: BarChart3,
    title: 'End-of-day reports',
    description:
      'Generate sales reports for each shift or day. Cash up quickly, track performance.',
    pro: true,
  },
]

export function FeaturesSection() {
  return (
    <Section tone="default" spacing="default">
      <SectionHeading
        className="mb-12"
        title="Built for the demands of physical retail"
      />

      <ul className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            as="li"
            icon={feature.icon}
            title={feature.title}
            badge={feature.pro && <Badge variant="pro">Pro</Badge>}
          >
            {feature.description}
          </FeatureCard>
        ))}
      </ul>
    </Section>
  )
}
