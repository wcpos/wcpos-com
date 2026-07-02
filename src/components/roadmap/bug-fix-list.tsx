import type { RoadmapItem } from '@/types/roadmap'
import { Collapsible } from '@/components/ui/collapsible'

const STATUS_WORD: Record<RoadmapItem['status'], string> = {
  done: 'fixed',
  in_progress: 'in progress',
  planned: 'planned',
}

const STATUS_DOT: Record<RoadmapItem['status'], string> = {
  done: 'bg-emerald-500',
  in_progress: 'bg-wcpos-red',
  planned: 'bg-slate-300 dark:bg-slate-600',
}

/**
 * BugFixList — a milestone's bug fixes behind a quiet inline disclosure.
 * Native <details> via the Collapsible primitive, so it works without JS.
 */
export function BugFixList({ bugs }: { bugs: RoadmapItem[] }) {
  if (bugs.length === 0) return null

  return (
    <Collapsible
      className="mt-2"
      summaryClassName="w-fit font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      summary={`+ ${bugs.length} bug ${bugs.length === 1 ? 'fix' : 'fixes'} & improvements`}
    >
      <ul className="mt-2 space-y-1.5 pl-4">
        {bugs.map((bug) => (
          <li key={bug.id}>
            <a
              href={bug.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline gap-2 text-sm text-muted-foreground"
            >
              <span
                className={`size-1.5 shrink-0 self-center rounded-full ${STATUS_DOT[bug.status]}`}
                aria-hidden
              />
              <span className="group-hover:text-foreground group-hover:underline">
                {bug.title}
              </span>
              <span className="font-mono text-[11px]">
                {STATUS_WORD[bug.status]}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Collapsible>
  )
}
