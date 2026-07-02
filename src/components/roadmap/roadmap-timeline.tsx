import type { RoadmapData, RoadmapItem, RoadmapMilestone } from '@/types/roadmap'
import { BugFixList } from './bug-fix-list'
import styles from './timeline.module.css'

/**
 * RoadmapTimeline — the "release train": one continuous vertical spine where
 * time is the hierarchy. The active release sits on a pulsing red node,
 * upcoming work rides a dashed rail below it, shipped releases fade out at
 * the bottom. Milestones and items come straight from the GitHub project
 * board (see services/core/external/github-roadmap.ts for the bucketing).
 */

const PROJECT_BOARD_URL = 'https://github.com/orgs/wcpos/projects/4'

type Tone = 'now' | 'next' | 'shipped'

function fmtDue(dueOn: string | null): string | null {
  if (!dueOn) return null
  // GitHub due dates are midnight-UTC timestamps; format in UTC so a
  // negative-offset server timezone can't shift them to the previous month.
  return new Date(dueOn).toLocaleDateString('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function StatusGlyph({ status }: { status: RoadmapItem['status'] }) {
  if (status === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" aria-label="Done">
        <circle cx="8" cy="8" r="7" className="fill-emerald-500" />
        <path
          d="M5 8.2l2 2 4-4.4"
          className="stroke-white"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg
        viewBox="0 0 16 16"
        className="mt-1 size-4 shrink-0"
        aria-label="In progress"
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          className="fill-none stroke-wcpos-red"
          strokeWidth="1.5"
        />
        <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" className="fill-wcpos-red" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" aria-label="Planned">
      <circle
        cx="8"
        cy="8"
        r="6.5"
        className="fill-none stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="1.5"
        strokeDasharray="3 2.5"
      />
    </svg>
  )
}

function FeatureRow({ item }: { item: RoadmapItem }) {
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 py-2"
      >
        <StatusGlyph status={item.status} />
        <span className="min-w-0 flex-1">
          <span className="break-words font-medium group-hover:text-wcpos-red dark:group-hover:text-wcpos-red-accent">
            {item.title}
          </span>
          {item.description && (
            <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
              {item.description}
            </span>
          )}
        </span>
        {item.subIssueProgress && (
          <span className="mt-1 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {item.subIssueProgress.completed}/{item.subIssueProgress.total}
          </span>
        )}
      </a>
    </li>
  )
}

const NODE_TONE: Record<Tone, string> = {
  now: `border-wcpos-red bg-wcpos-red ${styles.pulse}`,
  next: 'border-slate-400 bg-background dark:border-slate-500',
  shipped: 'border-emerald-500 bg-emerald-500',
}

function TimelineMilestone({
  milestone,
  tone,
}: {
  milestone: RoadmapMilestone
  tone: Tone
}) {
  const pct =
    milestone.progress.total > 0
      ? Math.round((milestone.progress.completed / milestone.progress.total) * 100)
      : 0
  const due = fmtDue(milestone.dueOn)

  return (
    <div className={tone === 'shipped' ? 'relative pb-14 opacity-60' : 'relative pb-14'}>
      {/* Node on the rail */}
      <span
        className={`absolute -left-[38px] top-2 size-4 rounded-full border-2 sm:-left-[46px] ${NODE_TONE[tone]}`}
        aria-hidden
      />

      {/* Ghost numeral behind the heading — version-style titles only */}
      {milestone.title.length <= 8 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 right-0 select-none font-mono text-7xl font-bold tracking-tighter text-foreground/[0.05] sm:text-8xl"
        >
          {milestone.title}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          {milestone.title}
        </h3>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {tone === 'shipped'
            ? 'shipped'
            : `${milestone.progress.completed} of ${milestone.progress.total} done`}
          {due ? (tone === 'shipped' ? ` · ${due}` : ` · due ${due}`) : ''}
        </span>
      </div>

      {tone !== 'shipped' && (
        <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-wcpos-red transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {milestone.description && (
        <p className="mt-3 max-w-xl text-muted-foreground">{milestone.description}</p>
      )}

      {milestone.features.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60">
          {milestone.features.map((f) => (
            <FeatureRow key={f.id} item={f} />
          ))}
        </ul>
      )}

      <BugFixList bugs={milestone.bugs} />
    </div>
  )
}

const RAIL_TONE: Record<Tone, string> = {
  now: 'border-wcpos-red/70',
  next: 'border-dashed border-slate-300 dark:border-slate-700',
  shipped: 'border-slate-200 dark:border-slate-800',
}

const LABEL_TONE: Record<Tone, string> = {
  now: 'bg-wcpos-red text-white',
  next: 'border border-slate-300 text-muted-foreground dark:border-slate-600',
  shipped: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

function RailGroup({
  label,
  milestones,
  tone,
}: {
  label: string
  milestones: RoadmapMilestone[]
  tone: Tone
}) {
  if (milestones.length === 0) return null
  return (
    <section className={`relative border-l-2 pl-8 sm:pl-10 ${RAIL_TONE[tone]}`}>
      <div className="pb-8">
        <span
          className={`inline-block rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] ${LABEL_TONE[tone]}`}
        >
          {label}
        </span>
      </div>
      {milestones.map((m, i) => (
        <div key={m.title} className={styles.rise} style={{ animationDelay: `${i * 90}ms` }}>
          <TimelineMilestone milestone={m} tone={tone} />
        </div>
      ))}
    </section>
  )
}

export function BoardLinkChip() {
  return (
    <a
      href={PROJECT_BOARD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      live from the WCPOS project board
      <span aria-hidden>&#8599;</span>
    </a>
  )
}

export function RoadmapTimeline({ data }: { data: RoadmapData }) {
  const hasContent =
    data.active.length > 0 || data.upcoming.length > 0 || data.shipped.length > 0

  if (!hasContent) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No roadmap items to display yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <RailGroup label="Now" milestones={data.active} tone="now" />
      <RailGroup label="Next" milestones={data.upcoming} tone="next" />
      <RailGroup label="Shipped" milestones={data.shipped} tone="shipped" />
    </div>
  )
}
