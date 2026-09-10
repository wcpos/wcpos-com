import type { Release } from './types'
import { groups, phaseTone, releaseDate, stateTone, visibleEpics } from './fixture'

export function VariantA({ releases }: { releases: Release[] }) {
  if (process.env.NODE_ENV === 'production') return null
  const rail = { now: 'border-wcpos-red', next: 'border-slate-400 dark:border-slate-500', later: 'border-dotted border-slate-400 dark:border-slate-500', shipped: 'border-emerald-500' }
  const glyph = { in_progress: '◐', planned: '◌', done: '✓' }
  return <div className="max-w-3xl pb-16" data-prototype="A">
    {groups.map(group => <section key={group} className={`ml-2 border-l-2 pl-6 sm:pl-10 ${rail[group]}`}>
      <div className="pb-7"><span className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] ${phaseTone[group]}`}>{group}</span></div>
      {releases.filter(r => r.group === group).map(release => {
        const epics = visibleEpics(release)
        return <article key={release.version} className="relative pb-16">
          <span className={`absolute -left-[33px] top-2 size-4 rounded-full border-2 bg-background sm:-left-[49px] ${rail[group]}`} />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl"><a href={release.url}>{release.version} <span className="text-muted-foreground">—</span> {release.theme}</a></h2>
          <p className="mt-3 font-mono text-xs text-muted-foreground">{releaseDate(release)} · {epics.filter(e => e.state === 'done').length} of {epics.length} epics done</p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">{release.why.split('\n\n').map(p => <p key={p}>{p}</p>)}</div>
          {!!release.notInRelease.length && <details className="my-5 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Not in this release <span className="ml-1 font-mono text-xs text-muted-foreground">({release.notInRelease.length})</span></summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">{release.notInRelease.map(item => <li key={item}>{item}</li>)}</ul>
          </details>}
          <ul className="mt-6 divide-y divide-border">
            {epics.map(epic => <li key={epic.title} className="flex gap-3 py-4">
              <span className={`text-lg ${stateTone[epic.state]}`}>{glyph[epic.state]}</span>
              <div className="min-w-0 flex-1">
                <a href={epic.url} className="text-sm font-semibold hover:text-wcpos-red-accent">{epic.title}</a>
                <p className="mt-1 truncate text-sm text-muted-foreground" title={epic.summary!}>{epic.summary}</p>
                {epic.progress && <div className="mt-2 flex items-center gap-3">
                  <div className="h-1 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-wcpos-red" style={{ width: `${epic.progress.completed / epic.progress.total * 100}%` }} /></div>
                  <span className="font-mono text-[10px] text-muted-foreground">{epic.progress.completed}/{epic.progress.total}</span>
                </div>}
              </div>
            </li>)}
          </ul>
          {!epics.length && <p className="mt-5 text-sm text-muted-foreground">No public items yet</p>}
        </article>
      })}
    </section>)}
  </div>
}
