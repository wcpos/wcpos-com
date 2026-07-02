import type { RoadmapData, RoadmapItem, RoadmapMilestone } from '@/types/roadmap'

/**
 * PROTOTYPE variant "focus" — mission control.
 *
 * The active milestone owns the page: a dark control-room hero with a large
 * progress ring and live stats, features as a worklog underneath, upcoming
 * milestones as a numbered queue, shipped work compressed to a changelog.
 * Hierarchy: what is happening right now. Delete with the prototype.
 */

function fmtDue(dueOn: string | null): string | null {
  if (!dueOn) return null
  return new Date(dueOn).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  })
}

function BigRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? completed / total : 0
  const r = 62
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 144 144" className="size-full -rotate-90">
        <circle
          cx="72"
          cy="72"
          r={r}
          className="fill-none stroke-white/10"
          strokeWidth="10"
        />
        <circle
          cx="72"
          cy="72"
          r={r}
          className="rp-ring fill-none stroke-wcpos-red-accent"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ ['--rp-offset' as string]: c * (1 - pct), strokeDashoffset: c * (1 - pct) }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold tabular-nums text-white">
          {Math.round(pct * 100)}%
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          {completed}/{total} issues
        </span>
      </div>
    </div>
  )
}

function WorklogRow({ item }: { item: RoadmapItem }) {
  const state =
    item.status === 'done'
      ? { glyph: '✓', cls: 'text-emerald-500', label: 'Done' }
      : item.status === 'in_progress'
        ? { glyph: '▸', cls: 'text-wcpos-red dark:text-wcpos-red-accent', label: 'In progress' }
        : { glyph: '·', cls: 'text-muted-foreground', label: 'Planned' }
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-x-2 py-3 sm:grid-cols-[1.5rem_1fr_8rem_auto]"
      >
        <span className={`font-mono text-lg leading-none ${state.cls}`} aria-hidden>
          {state.glyph}
        </span>
        <span>
          <span className="font-medium group-hover:underline">{item.title}</span>
          {item.description && (
            <span className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">
              {item.description}
            </span>
          )}
        </span>
        <span className="hidden sm:block">
          {item.subIssueProgress && (
            <span className="flex items-center gap-2">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-wcpos-red"
                  style={{
                    width: `${
                      item.subIssueProgress.total > 0
                        ? (item.subIssueProgress.completed / item.subIssueProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {item.subIssueProgress.completed}/{item.subIssueProgress.total}
              </span>
            </span>
          )}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {state.label}
        </span>
      </a>
    </li>
  )
}

function FocusHero({ milestone }: { milestone: RoadmapMilestone }) {
  const inFlight = milestone.features.filter((f) => f.status === 'in_progress').length
  const planned = milestone.features.filter((f) => f.status === 'planned').length
  const done =
    milestone.features.filter((f) => f.status === 'done').length +
    milestone.bugs.filter((b) => b.status === 'done').length
  const due = fmtDue(milestone.dueOn)

  return (
    <section
      className="bg-slate-950 text-white"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-10 px-4 py-16 sm:py-20 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-wcpos-red-accent">
            Current focus · {milestone.title}
            {due ? ` · lands ${due}` : ''}
          </p>
          <h1 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            {milestone.description ?? milestone.title}
          </h1>
          <dl className="mt-8 flex gap-8">
            {(
              [
                [inFlight, 'In flight'],
                [planned, 'Queued'],
                [done, 'Landed'],
              ] as const
            ).map(([n, label]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                  {label}
                </dt>
                <dd className="mt-1 font-mono text-3xl font-bold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <BigRing
          completed={milestone.progress.completed}
          total={milestone.progress.total}
        />
      </div>
    </section>
  )
}

export function VariantFocus({ data }: { data: RoadmapData }) {
  const focus = data.active[0]

  return (
    <div>
      <style>{`
        @keyframes rp-ring-kf { from { stroke-dashoffset: 390; } to { stroke-dashoffset: var(--rp-offset); } }
        .rp-ring { animation: rp-ring-kf 1.2s ease-out both; }
      `}</style>

      {focus && <FocusHero milestone={focus} />}

      {focus && (
        <section className="mx-auto w-full max-w-4xl px-4 py-12">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            The worklog
          </h2>
          <ul className="mt-4 divide-y">
            {[...focus.features, ...focus.bugs].map((item) => (
              <WorklogRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section className="border-y bg-muted/40">
          <div className="mx-auto w-full max-w-4xl px-4 py-12">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Up next
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {data.upcoming.map((m, i) => (
                <article
                  key={m.title}
                  className="relative overflow-hidden rounded-lg border bg-white p-5 dark:bg-slate-900"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-2 -top-6 select-none font-mono text-7xl font-bold text-foreground/[0.05]"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-semibold">{m.title}</h3>
                  {m.description && (
                    <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">
                      {m.description}
                    </p>
                  )}
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {m.features.length} feature{m.features.length !== 1 ? 's' : ''}
                    {fmtDue(m.dueOn) ? ` · target ${fmtDue(m.dueOn)}` : ' · unscheduled'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.shipped.length > 0 && (
        <section className="mx-auto w-full max-w-4xl px-4 py-12">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Shipped
          </h2>
          <div className="mt-4 space-y-8">
            {data.shipped.map((m) => (
              <div key={m.title}>
                <h3 className="flex items-baseline gap-2 font-mono text-sm font-semibold">
                  {m.title}
                  {fmtDue(m.dueOn) && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {fmtDue(m.dueOn)}
                    </span>
                  )}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {[...m.features, ...m.bugs].map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-emerald-500" aria-hidden>
                          ✓
                        </span>
                        <span className="group-hover:text-foreground group-hover:underline">
                          {item.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
