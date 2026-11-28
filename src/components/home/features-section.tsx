import { useTranslations } from 'next-intl'
import {
  CalendarDays,
  CreditCard,
  History,
  MonitorSmartphone,
  Search,
  Store,
  Tag,
  TicketPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { IconTile } from '@/components/ui/icon-tile'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import {
  FREE_IN_TWO,
  type FreeInTwoId,
} from '@/components/home/scroll-story/free-in-two-strip'

type ItemId =
  | 'f1'
  | 'f3'
  | 'f4'
  | 'f5'
  | 'f6'
  | 'readers'
  | 'coupons'
  | 'stores'
  | 'display'

/**
 * A row's copy. The 2.0 features take their label (and, where it is the
 * same, their line) from the strip, so a feature reads identically there,
 * here and on the plan cards.
 */
type Row =
  | { item: ItemId; Icon: LucideIcon; pro: boolean }
  | { free2: FreeInTwoId; description?: 'f2' | 'coupon' | 'today' }

const free2Icon = (id: FreeInTwoId) =>
  FREE_IN_TWO.find((entry) => entry.id === id)!.Icon

const rows: Row[] = [
  { item: 'f1', Icon: Search, pro: false },
  { free2: 'split', description: 'f2' },
  { free2: 'offline' },
  { free2: 'register' },
  { free2: 'coupon', description: 'coupon' },
  { free2: 'today', description: 'today' },
  { item: 'readers', Icon: CreditCard, pro: true },
  { item: 'coupons', Icon: TicketPlus, pro: true },
  { item: 'f6', Icon: CalendarDays, pro: true },
  { item: 'f3', Icon: Users, pro: true },
  { item: 'f4', Icon: History, pro: true },
  { item: 'f5', Icon: Tag, pro: true },
  { item: 'stores', Icon: Store, pro: true },
  { item: 'display', Icon: MonitorSmartphone, pro: true },
]

export function FeaturesSection() {
  const t = useTranslations('home')

  return (
    <Section tone="default" spacing="compact" className="border-t border-border">
      <SectionHeading className="mb-8" title={t('features.heading')} />

      <ul className="grid md:grid-cols-2 md:gap-x-12">
        {rows.map((row) => {
          const { key, Icon, pro, title, description } =
            'item' in row
              ? {
                  key: row.item,
                  Icon: row.Icon,
                  pro: row.pro,
                  title: t(`features.items.${row.item}.title`),
                  description: t(`features.items.${row.item}.description`),
                }
              : {
                  key: row.free2,
                  Icon: free2Icon(row.free2),
                  pro: false,
                  title: t(`story.free2.${row.free2}.title`),
                  description: row.description
                    ? t(`features.items.${row.description}.description`)
                    : t(`story.free2.${row.free2}.line`),
                }
          return (
            <li key={key} className="flex gap-4 border-t border-border py-[18px]">
              <IconTile tone="brand" size="lg">
                <Icon />
              </IconTile>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  {title}
                  {pro && (
                    <>
                      {' '}
                      <Badge variant="pro" className="ml-1 align-middle">
                        Pro
                      </Badge>
                    </>
                  )}
                </h3>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
