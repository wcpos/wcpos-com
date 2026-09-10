import type { Release } from './types'
import { groups, releaseDate, stateLabel, stateTone, visibleEpics } from './fixture'

export function VariantC({ releases }: { releases: Release[] }) {
  if (process.env.NODE_ENV === 'production') return null
  return <div className="grid items-start gap-12 pb-16 md:grid-cols-[200px_minmax(0,1fr)] lg:gap-20" data-prototype="C">
    <nav className="grid grid-cols-2 gap-5 border-t pt-5 md:sticky md:top-24 md:grid-cols-1">
      {groups.map(group => <div key={group}>
        <p className={`mb-2 font-mono text-[10px] uppercase tracking-[0.2em] ${group === 'now' ? 'text-wcpos-red-accent' : group === 'shipped' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{group}</p>
        {releases.filter(r => r.group === group).map(release => <a key={release.version} href={`#${release.version}`} className="mb-3 block hover:text-wcpos-red-accent"><span className="font-mono text-sm">{release.version}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{release.theme}</span></a>)}
      </div>)}
    </nav>
    <div>
      {releases.map(release => {
        const epics = visibleEpics(release)
        return <section key={release.version} id={release.version} className="scroll-mt-24 pb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs"><span className="text-wcpos-red-accent">{release.version} <span className="ml-3 uppercase text-muted-foreground">{release.group}</span></span><span className="text-muted-foreground">{releaseDate(release)}</span></div>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight"><a href={release.url}>{release.theme}</a></h2>
          <p className="mt-3 font-mono text-xs text-muted-foreground">{epics.filter(e => e.state === 'done').length} of {epics.length} epics done</p>
          <hr className="my-6" />
          <div className="max-w-prose space-y-4 text-[15px] leading-7">{release.why.split('\n\n').map(p => <p key={p}>{p}</p>)}</div>
          {!!release.notInRelease.length && <div className="mt-6 text-sm leading-6"><h3 className="font-semibold">Not in this release</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{release.notInRelease.map(item => <li key={item}>{item}</li>)}</ul></div>}
          <h3 className="mb-2 mt-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">Epics</h3>
          <div className="border-t">
            {epics.map(epic => <div key={epic.title} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b py-4 sm:grid-cols-[88px_1fr_auto]">
              <span className={`col-span-2 font-mono text-[10px] uppercase leading-6 sm:col-span-1 ${stateTone[epic.state]}`}>{stateLabel[epic.state]}</span>
              <div><a href={epic.url} className="text-sm font-semibold hover:text-wcpos-red-accent">{epic.title}</a><p className="mt-1 text-sm leading-6 text-muted-foreground">{epic.summary}</p></div>
              <span className="font-mono text-xs leading-6 text-muted-foreground">{epic.progress && `${epic.progress.completed}/${epic.progress.total}`}</span>
            </div>)}
          </div>
          {!epics.length && <p className="mt-4 text-sm text-muted-foreground">No public items yet</p>}
        </section>
      })}
    </div>
  </div>
}
