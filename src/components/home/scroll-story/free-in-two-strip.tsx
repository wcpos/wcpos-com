import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3, Split, TicketPercent, Wallet, WifiOff } from 'lucide-react'
import { IconTile } from '@/components/ui/icon-tile'
import { Section } from '@/components/ui/section'

/**
 * What became free in WCPOS 2.0, one fact per feature. The labels are the
 * same ones "What the register does" and the plan cards use, so each feature
 * reads identically wherever it appears; the icons are shared for the same
 * reason.
 */
export const FREE_IN_TWO = [
  { id: 'register', Icon: Wallet },
  { id: 'split', Icon: Split },
  { id: 'offline', Icon: WifiOff },
  { id: 'coupon', Icon: TicketPercent },
  { id: 'today', Icon: BarChart3 },
] as const

export type FreeInTwoId = (typeof FREE_IN_TWO)[number]['id']

// column widths follow each item's text so the five columns end together
const columns = 'lg:grid-cols-[1.3fr_0.8fr_1.3fr_0.8fr_1.1fr]'

export function FreeInTwoStrip() {
  const t = useTranslations('home.story.free2')
  // the stacked story can render twice (CSS-switched), so the id is unique
  const headingId = useId()

  return (
    <Section tone="default" spacing="none" aria-labelledby={headingId}>
      <div className="pb-5 pt-4">
        <div className="flex flex-col gap-0.5 pb-3.5 sm:flex-row sm:items-baseline sm:gap-2.5">
          <h2 id={headingId} className="font-bold text-foreground">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('since')}</p>
        </div>
        <ul className={`grid ${columns}`}>
          {FREE_IN_TWO.map(({ id, Icon }) => (
            <li
              key={id}
              className="flex gap-3 border-t border-border py-3 lg:border-l lg:border-t-0 lg:px-3 lg:py-0 lg:first:border-l-0 lg:first:pl-0"
            >
              <IconTile tone="brand" size="lg">
                <Icon />
              </IconTile>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {t(`${id}.title`)}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`${id}.line`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
