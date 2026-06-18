import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Collapsible — a native <details>/<summary> disclosure. Owns the
 * `list-none` + hidden `::-webkit-details-marker` reset and the rotating
 * chevron that the download picker and release history each re-implemented.
 * No JS: it is the platform disclosure, progressively enhanced.
 */
export interface CollapsibleProps
  extends React.HTMLAttributes<HTMLDetailsElement> {
  summary: React.ReactNode
  /**
   * Initial open state, rendered as the native `open` attribute so the
   * disclosure is correct on first paint with no JS. This is uncontrolled:
   * pass a render-stable value (React only reconciles `open` when the prop
   * value changes, so the user's native toggle is preserved across re-renders).
   * A `useRef`/`useEffect` approach is avoided on purpose — it would force this
   * into a client component and lose the no-JS SSR guarantee.
   */
  defaultOpen?: boolean
  /** Class applied to the <summary> trigger row. */
  summaryClassName?: string
}

function Collapsible({
  className,
  summary,
  summaryClassName,
  defaultOpen,
  children,
  ...props
}: CollapsibleProps) {
  return (
    <details className={cn('group', className)} open={defaultOpen} {...props}>
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden',
          summaryClassName,
        )}
      >
        {summary}
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      {children}
    </details>
  )
}

export { Collapsible }
