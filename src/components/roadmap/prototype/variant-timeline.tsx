import type { RoadmapData, RoadmapItem, RoadmapMilestone } from '@/types/roadmap'
import { TimelineBugs } from './timeline-bugs'

const PROJECT_BOARD_URL = 'https://github.com/orgs/wcpos/projects/4'

/**
 * PROTOTYPE variant "timeline" — the release train.
 *
 * One continuous vertical spine; time is the hierarchy. Future work rides a
 * dashed rail up top, the active release sits on a pulsing red node, shipped
 * releases fade out below. Ghost version numerals, status glyphs instead of
 * badges, editorial single column. Delete with the prototype.
 */

function fmtDue(dueOn: string | null): string | null {
  if (!dueOn) return null
  return new Date(dueOn).toLocaleDateString('en', {
    month: 'short',
    year: 'numeric',
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
      <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" aria-label="In progress">
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
        <span className="flex-1">
          <span className="font-medium group-hover:text-wcpos-red dark:group-hover:text-wcpos-red-accent">
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

function TimelineMilestone({
  milestone,
  tone,
}: {
  milestone: RoadmapMilestone
  tone: 'now' | 'next' | 'shipped'
}) {
  const pct =
    milestone.progress.total > 0
      ? Math.round((milestone.progress.completed / milestone.progress.total) * 100)
      : 0
  const due = fmtDue(milestone.dueOn)

  return (
    <div className={tone === 'shipped' ? 'relative pb-14 opacity-60' : 'relative pb-14'}>
      {/* Node on the rail. Border colors are inline — an unlayered
          `* { border-color }` reset in globals.css overrides the utilities. */}
      <span
        className={
          'absolute -left-[38px] top-2 size-4 rounded-full border-2 sm:-left-[46px] ' +
          (tone === 'now'
            ? 'bg-wcpos-red rp-pulse'
            : tone === 'next'
              ? 'bg-background'
              : 'bg-emerald-500')
        }
        style={{
          borderColor:
            tone === 'now'
              ? 'hsl(var(--wcpos-red))'
              : tone === 'next'
                ? '#94a3b8'
                : '#10b981',
        }}
        aria-hidden
      />

      {/* Ghost version numeral — only for short version-style titles */}
      {milestone.title.length <= 8 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 right-0 select-none font-mono text-7xl font-bold tracking-tighter text-foreground/[0.05] sm:text-8xl"
        >
          {milestone.title}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {milestone.title}
        </h3>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {tone === 'shipped'
            ? 'shipped'
            : `${milestone.progress.completed} of ${milestone.progress.total} done`}
          {due && tone !== 'shipped' ? ` · due ${due}` : ''}
          {due && tone === 'shipped' ? ` · ${due}` : ''}
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

      <TimelineBugs bugs={milestone.bugs} />
    </div>
  )
}

function RailGroup({
  label,
  milestones,
  tone,
}: {
  label: string
  milestones: RoadmapMilestone[]
  tone: 'now' | 'next' | 'shipped'
}) {
  if (milestones.length === 0) return null
  return (
    <section
      className={
        'relative border-l-2 pl-8 sm:pl-10 ' + (tone === 'next' ? 'border-dashed' : '')
      }
      style={{
        borderLeftColor:
          tone === 'now' ? 'hsl(var(--wcpos-red) / 0.7)' : 'hsl(var(--border))',
      }}
    >
      <div className="pb-8">
        <span
          className={
            'inline-block rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] ' +
            (tone === 'now'
              ? 'bg-wcpos-red text-white'
              : tone === 'next'
                ? 'border border-slate-300 text-muted-foreground dark:border-slate-600'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')
          }
        >
          {label}
        </span>
      </div>
      {milestones.map((m, i) => (
        <div key={m.title} className="rp-rise" style={{ animationDelay: `${i * 90}ms` }}>
          <TimelineMilestone milestone={m} tone={tone} />
        </div>
      ))}
    </section>
  )
}

export function VariantTimeline({ data }: { data: RoadmapData }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <style>{`
        @keyframes rp-rise-kf { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .rp-rise { animation: rp-rise-kf 0.5s ease-out both; }
        @keyframes rp-pulse-kf { 0%, 100% { box-shadow: 0 0 0 0 hsl(var(--wcpos-red) / 0.45); } 50% { box-shadow: 0 0 0 8px hsl(var(--wcpos-red) / 0); } }
        .rp-pulse { animation: rp-pulse-kf 2s ease-out infinite; }
      `}</style>

      <header className="mb-14">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-wcpos-red dark:text-wcpos-red-accent">
          Roadmap
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          The release train
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Every stop on the way to a faster, offline-proof WooCommerce POS — pulled
          straight from our GitHub, newest work first.
        </p>
        <a
          href={PROJECT_BOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          live from the WCPOS project board
          <span aria-hidden>&#8599;</span>
        </a>
      </header>

      <div className="space-y-4">
        <RailGroup label="Now" milestones={data.active} tone="now" />
        <RailGroup label="Next" milestones={data.upcoming} tone="next" />
        <RailGroup label="Shipped" milestones={data.shipped} tone="shipped" />
      </div>
    </div>
  )
}
