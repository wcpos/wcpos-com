import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { formatDateForLocale } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import { QuestionSection } from './question-section'

const milestones = [
  { id: 'm1', date: { type: 'month', value: '2011-12-01T00:00:00Z' } },
  { id: 'm2', date: { type: 'range', start: 2011, end: 2014 } },
  { id: 'm3', date: { type: 'month', value: '2014-04-01T00:00:00Z' } },
  { id: 'm4', date: { type: 'day', value: '2014-05-11T00:00:00Z' } },
  { id: 'm5', date: { type: 'day', value: '2023-05-04T00:00:00Z' } },
  { id: 'm6', date: { type: 'month', value: '2025-12-01T00:00:00Z' } },
  { id: 'm7', date: { type: 'day', value: '2026-11-09T00:00:00Z' } },
] as const

type MilestoneId = (typeof milestones)[number]['id']

/**
 * One milestone-date role, shared by the hero answer row and the timeline.
 * The newest milestone (m7) is current: red date, filled marker, badge.
 */
export function milestoneDateClassName(current: boolean) {
  return cn(
    'text-sm tabular-nums',
    current
      ? 'font-semibold text-wcpos-red-accent'
      : 'font-medium text-muted-foreground'
  )
}

/** Formats a milestone's date for the locale (month, day, or a year range). */
export function useMilestoneDate() {
  const locale = useLocale()
  const t = useTranslations('about.timeline.dates')
  return (id: MilestoneId) => {
    const date = milestones.find((m) => m.id === id)!.date
    if (date.type === 'range') {
      return t('range', { start: date.start, end: date.end })
    }
    return formatDateForLocale(date.value, locale, {
      day: date.type === 'day' ? 'numeric' : undefined,
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
}

/**
 * The company timeline, at rest: every milestone visible on a plain track,
 * past markers as muted rings, the newest filled brand red.
 */
export function StoryTimeline() {
  const t = useTranslations('about.timeline')
  const tBadge = useTranslations('account.downloads')
  const formatDate = useMilestoneDate()

  return (
    <QuestionSection
      id="how-long"
      tone="default"
      title={t('heading')}
      lead={t('lead')}
    >
      <ol className="relative max-w-180 pt-1 before:absolute before:bottom-2.5 before:left-[5px] before:top-2.5 before:w-0.5 before:bg-border">
        {milestones.map(({ id }) => {
          const current = id === 'm7'
          return (
            <li key={id} className="relative mb-9 pl-9 last:mb-0">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-0 top-1 size-3 rounded-full border-2',
                  current
                    ? 'border-wcpos-red bg-wcpos-red'
                    : 'border-muted-foreground bg-background'
                )}
              />
              <p className={milestoneDateClassName(current)}>
                {formatDate(id)}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {t(`items.${id}.title`)}
                {current && (
                  <>
                    {' '}
                    <Badge variant="brand-tint" className="ml-2 align-middle">
                      {tBadge('latestBadge')}
                    </Badge>
                  </>
                )}
              </h3>
              <p className="mt-1 max-w-[65ch] leading-relaxed text-muted-foreground">
                {t(`items.${id}.body`)}
              </p>
            </li>
          )
        })}
      </ol>
    </QuestionSection>
  )
}
