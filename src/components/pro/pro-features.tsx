import {
  BarChart3,
  ClipboardList,
  CreditCard,
  MonitorSmartphone,
  PencilRuler,
  Plug,
  Store,
  TicketPercent,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { IconTile } from '@/components/ui/icon-tile'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'
import { Link } from '@/i18n/navigation'

/**
 * The Pro feature list — appears exactly once on /pro, below the hero.
 * Copy comes from the `pro.features` message namespace via the page; only
 * the icon pairing and the grouping by job live here. Sync on purpose: the
 * page must render this statically while the buy box suspends.
 */
export const PRO_FEATURE_KEYS = [
  { key: 'terminal', group: 'payment', Icon: CreditCard },
  { key: 'display', group: 'payment', Icon: MonitorSmartphone },
  { key: 'gateways', group: 'payment', Icon: Plug },
  { key: 'stockPrice', group: 'store', Icon: PencilRuler },
  { key: 'orders', group: 'store', Icon: ClipboardList },
  { key: 'customers', group: 'store', Icon: Users },
  { key: 'coupons', group: 'store', Icon: TicketPercent },
  { key: 'stores', group: 'scale', Icon: Store },
  { key: 'reports', group: 'scale', Icon: BarChart3 },
] as const

export const PRO_FEATURE_GROUPS = ['payment', 'store', 'scale'] as const

// Product and terminal names never break across lines.
const UNBROKEN_NAMES =
  /(Stripe Terminal|Mollie Terminal|Square Terminal|PayPal Reader|WCPOS Pro|WooCommerce|SumUp)/

function keepNamesWhole(text: string) {
  return text.split(UNBROKEN_NAMES).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  )
}

export interface ProFeature {
  Icon: LucideIcon
  title: string
  description: string
  link?: { label: string; href: string }
}

export interface ProFeatureGroup {
  title: string
  intro: string
  features: ProFeature[]
}

export function ProFeatureList({
  heading,
  groups,
}: {
  heading: string
  groups: ProFeatureGroup[]
}) {
  return (
    <div className="min-w-0">
      <SectionHeading align="left" title={heading} />
      <div className="mt-6 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-3 lg:gap-14">
        {groups.map((group) => (
          <div key={group.title} className="min-w-0">
            <h3 className="text-lg font-semibold">{group.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground lg:min-h-10">
              {group.intro}
            </p>
            <div className="mt-6 space-y-6">
              {group.features.map(({ Icon, title, description, link }) => (
                <div key={title} className="flex gap-3.5">
                  <IconTile tone="brand" size="md">
                    <Icon />
                  </IconTile>
                  <div className="min-w-0">
                    <h4 className="font-semibold">{title}</h4>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {keepNamesWhole(description)}
                    </p>
                    {link && (
                      <p className="mt-1.5 text-sm">
                        <TextLink asChild>
                          <Link href={link.href}>{link.label}</Link>
                        </TextLink>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
