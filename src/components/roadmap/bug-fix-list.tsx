'use client'

import { useState } from 'react'
import type { RoadmapItem } from '@/types/roadmap'
import { Badge } from '@/components/ui/badge'

interface BugFixListProps {
  bugs: RoadmapItem[]
}

const statusConfig = {
  planned: { label: 'Planned', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  done: { label: 'Done', variant: 'success' as const },
}

export function BugFixList({ bugs }: BugFixListProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{bugs.length} bug fix{bugs.length !== 1 ? 'es' : ''} &amp; improvements</span>
        <span className="text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <ul className="border-t divide-y">
          {bugs.map(bug => {
            const status = statusConfig[bug.status]
            return (
              <li key={bug.id}>
                <a
                  href={bug.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span>{bug.title}</span>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
