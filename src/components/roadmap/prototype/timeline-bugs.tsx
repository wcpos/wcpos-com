'use client'

import { useId, useState } from 'react'
import type { RoadmapItem } from '@/types/roadmap'

/**
 * PROTOTYPE — small inline accordion for a milestone's bug fixes in the
 * timeline variant. Mono, quiet, expands to a linked list. Delete with the
 * prototype.
 */

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

export function TimelineBugs({ bugs }: { bugs: RoadmapItem[] }) {
  const listId = useId()
  const [open, setOpen] = useState(false)

  if (bugs.length === 0) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="group inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span
          aria-hidden
          className={
            'inline-block transition-transform duration-200 ' +
            (open ? 'rotate-90' : '')
          }
        >
          &#9656;
        </span>
        {`+ ${bugs.length} bug ${bugs.length === 1 ? 'fix' : 'fixes'} & improvements`}
      </button>
      {open && (
        <ul id={listId} className="mt-2 space-y-1.5 pl-4">
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
      )}
    </div>
  )
}
