import {
  BarChart3,
  ClipboardList,
  CreditCard,
  PencilRuler,
  Plug,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { IconTile } from '@/components/ui/icon-tile'
import { SectionHeading } from '@/components/ui/section-heading'

/**
 * The Pro feature list — appears exactly once on /pro, beside the buy box.
 * Copy comes from the `pro.features` message namespace via the page; only
 * the icon pairing lives here. Sync on purpose: the page must render this
 * statically while the buy box suspends.
 */
export const PRO_FEATURE_KEYS = [
  { key: 'terminal', Icon: CreditCard },
  { key: 'stockPrice', Icon: PencilRuler },
  { key: 'orders', Icon: ClipboardList },
  { key: 'customers', Icon: Users },
  { key: 'reports', Icon: BarChart3 },
  { key: 'gateways', Icon: Plug },
] as const

export interface ProFeature {
  Icon: LucideIcon
  title: string
  description: string
}

export function ProFeatureList({
  heading,
  subtitle,
  features,
}: {
  heading: string
  subtitle: string
  features: ProFeature[]
}) {
  return (
    <div>
      <SectionHeading align="left" title={heading} subtitle={subtitle} />
      <div className="mt-10 space-y-7">
        {features.map(({ Icon, title, description }) => (
          <div key={title} className="flex gap-4">
            <IconTile tone="brand" size="lg">
              <Icon />
            </IconTile>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
