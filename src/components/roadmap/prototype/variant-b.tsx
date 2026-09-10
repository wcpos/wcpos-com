import type { Release } from './types'
import { phaseTone, releaseDate, stateLabel, stateTone, visibleEpics } from './fixture'

export function VariantB({ releases }: { releases: Release[] }) {
  if (process.env.NODE_ENV === 'production') return null
  const now = releases.find(r => r.group === 'now')!
  const epics = visibleEpics(now)
  return <div className="pb-16" data-prototype="B">
    <article className="border-t-4 border-wcpos-red bg-muted/35 px-5 py-8 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${phaseTone.now}`}>Now</span>
          <p className="mt-6 font-mono text-sm text-wcpos-red-accent">{now.version}</p>
          <h2 className="mt-2 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl"><a href={now.url}>{now.theme}</a></h2>
          <p className="mt-4 text-sm text-muted-foreground">{releaseDate(now)}</p>
        </div>
        <div className="sm:text-right"><p className="font-mono text-6xl tracking-tighter"><span className="text-wcpos-red-accent">{epics.filter(e => e.state === 'done').length}</span><span className="text-muted-foreground/50"> / {epics.length}</span></p><p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Epics done</p></div>
      </div>
      <div className="mt-10 grid gap-8 border-t pt-7 md:grid-cols-[1.6fr_1fr]">
        <div><h3 className="mb-4 text-sm font-semibold">Why this release</h3><div className="space-y-4 text-sm leading-7 text-muted-foreground">{now.why.split('\n\n').map(p => <p key={p}>{p}</p>)}</div></div>
        <div className="md:border-l md:pl-8"><h3 className="mb-4 text-sm font-semibold">Not in this release</h3><ul className="list-disc space-y-3 pl-4 text-sm leading-6 text-muted-foreground">{now.notInRelease.map(item => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <div className="mt-10 flex items-baseline justify-between border-t pt-6"><h3 className="font-semibold">Inside {now.version}</h3><span className="font-mono text-xs text-muted-foreground">{epics.length} public epics</span></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {epics.map(epic => <article key={epic.title} className="flex flex-col rounded-lg border bg-background p-5">
          <span className={`mb-3 self-start rounded-full bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${stateTone[epic.state]}`}>{stateLabel[epic.state]}</span>
          <h4 className="text-lg font-semibold tracking-tight"><a href={epic.url}>{epic.title}</a></h4>
          <p className="mb-5 mt-2 flex-1 text-sm leading-6 text-muted-foreground">{epic.summary}</p>
          {epic.progress && <div className="flex items-center gap-3"><div className="h-1 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-wcpos-red" style={{ width: `${epic.progress.completed / epic.progress.total * 100}%` }} /></div><span className="font-mono text-xs text-muted-foreground">{epic.progress.completed}/{epic.progress.total}</span></div>}
        </article>)}
      </div>
      {!epics.length && <p className="mt-5 text-sm text-muted-foreground">No public items yet</p>}
    </article>
    <section className="mt-12 space-y-4">
      <h2 className="mb-5 text-xl font-semibold">Coming down the line</h2>
      {releases.filter(r => r.group === 'next' || r.group === 'later').map(release => {
        const items = visibleEpics(release)
        return <article key={release.version} className="rounded-lg border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${phaseTone[release.group]}`}>{release.group}</span><span className="font-mono text-xs text-muted-foreground">{releaseDate(release)}</span></div>
          <h3 className="mt-4 text-xl font-semibold"><a href={release.url}><span className="mr-3 font-mono text-sm text-muted-foreground">{release.version}</span>{release.theme}</a></h3>
          {items.length ? <p className="mt-3 text-sm text-muted-foreground">{items.length} epics · {items.slice(0, 2).map(e => e.title).join(' · ')}</p> : <><div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">{release.why.split('\n\n').map(p => <p key={p}>{p}</p>)}</div><p className="mt-4 text-sm text-muted-foreground">No public items yet</p></>}
        </article>
      })}
    </section>
    <section className="mt-12 border-y py-5"><h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Shipped</h2>
      {releases.filter(r => r.group === 'shipped').map(release => <div key={release.version} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><a href={release.url}><span className="mr-3 font-mono">{release.version}</span>{release.theme}</a><span className="text-muted-foreground">{releaseDate(release)}</span></div>)}
    </section>
  </div>
}
