import type { RoadmapData, RoadmapItem, RoadmapMilestone } from '@/types/roadmap'

/**
 * PROTOTYPE variant "board" — Now / Next / Shipped status board.
 *
 * Status is the hierarchy: three dense columns visible at once, like the
 * project board the data actually comes from. Milestones are card groups
 * inside their column; features are compact rows with status dots; each
 * milestone header carries a small SVG progress ring. Built to be scanned in
 * ten seconds. Delete with the prototype.
 */

const DOT: Record<RoadmapItem['status'], string> = {
  done: 'bg-emerald-500',
  in_progress: 'bg-wcpos-red',
  planned: 'bg-slate-300 dark:bg-slate-600',
}

const DOT_LABEL: Record<RoadmapItem['status'], string> = {
  done: 'Done',
  in_progress: 'In progress',
  planned: 'Planned',
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? completed / total : 0
  const r = 9
  const c = 2 * Math.PI * r
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90">
        <circle cx="12" cy="12" r={r} className="fill-none stroke-muted" strokeWidth="3" />
        <circle
          cx="12"
          cy="12"
          r={r}
          className={
            'fill-none ' + (pct >= 1 ? 'stroke-emerald-500' : 'stroke-wcpos-red')
          }
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {Math.round(pct * 100)}%
      </span>
    </span>
  )
}

function ItemRow({ item }: { item: RoadmapItem }) {
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title={item.description || item.title}
        className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted/60"
      >
        <span
          className={`size-2 shrink-0 rounded-full ${DOT[item.status]}`}
          role="img"
          aria-label={DOT_LABEL[item.status]}
        />
        <span className="flex-1 truncate">{item.title}</span>
        {item.subIssueProgress && (
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {item.subIssueProgress.completed}/{item.subIssueProgress.total}
          </span>
        )}
      </a>
    </li>
  )
}

function MilestoneCard({ milestone }: { milestone: RoadmapMilestone }) {
  const bugCount = milestone.bugs.length
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3.5 py-2.5">
        <h3 className="truncate text-sm font-semibold">{milestone.title}</h3>
        <ProgressRing
          completed={milestone.progress.completed}
          total={milestone.progress.total}
        />
      </div>
      {milestone.description && (
        <p className="line-clamp-2 border-b px-3.5 py-2 text-xs text-muted-foreground">
          {milestone.description}
        </p>
      )}
      <ul className="divide-y divide-border/60">
        {milestone.features.map((f) => (
          <ItemRow key={f.id} item={f} />
        ))}
        {milestone.bugs.map((b) => (
          <ItemRow key={b.id} item={b} />
        ))}
      </ul>
      {milestone.features.length + bugCount === 0 && (
        <p className="px-3.5 py-3 text-xs text-muted-foreground">Nothing public yet.</p>
      )}
    </div>
  )
}

function Column({
  label,
  hint,
  milestones,
  accentColor,
  dim,
}: {
  label: string
  hint: string
  milestones: RoadmapMilestone[]
  /** Inline style — an unlayered `* { border-color }` reset in globals.css
      overrides border-color utilities, so classes don't work here. */
  accentColor: string
  dim?: boolean
}) {
  const itemCount = milestones.reduce(
    (n, m) => n + m.features.length + m.bugs.length,
    0,
  )
  return (
    <section
      className={'rounded-xl border-t-4 bg-muted/30 p-3 ' + (dim ? 'opacity-80' : '')}
      style={{ borderTopColor: accentColor }}
    >
      <header className="flex items-baseline justify-between px-1 pb-3 pt-1">
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
            {label}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          {itemCount}
        </span>
      </header>
      <div className="space-y-3">
        {milestones.map((m) => (
          <MilestoneCard key={m.title} milestone={m} />
        ))}
        {milestones.length === 0 && (
          <p className="px-1 py-4 text-xs text-muted-foreground">Empty for now.</p>
        )}
      </div>
    </section>
  )
}

export function VariantBoard({ data }: { data: RoadmapData }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-wcpos-red dark:text-wcpos-red-accent">
            Roadmap
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            The board, as we see it
          </h1>
          <p className="mt-2 max-w-lg text-muted-foreground">
            Our actual GitHub project board — every public feature and fix, in the
            column it sits in today.
          </p>
        </div>
        <dl className="flex items-center gap-4 rounded-lg border px-4 py-2 text-xs text-muted-foreground">
          {(
            [
              ['done', 'Done'],
              ['in_progress', 'In progress'],
              ['planned', 'Planned'],
            ] as const
          ).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5">
              <dt className={`size-2 rounded-full ${DOT[status]}`} />
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Column
          label="Now"
          hint="In active development"
          milestones={data.active}
          accentColor="hsl(var(--wcpos-red))"
        />
        <Column
          label="Next"
          hint="Queued up after the current release"
          milestones={data.upcoming}
          accentColor="#94a3b8"
        />
        <Column
          label="Shipped"
          hint="Recently released"
          milestones={data.shipped}
          accentColor="#10b981"
          dim
        />
      </div>
    </div>
  )
}
