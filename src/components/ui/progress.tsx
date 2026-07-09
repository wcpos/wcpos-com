import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Progress — a thin track + brand fill bar. Owns the radius, transition and the
 * clamped percentage math that the roadmap feature-card and milestone-section
 * each recomputed inline (with h-1 vs h-1.5 drift). Fill is `bg-primary`, which
 * is re-skinned to the WCPOS red brand (ADR 0005).
 */
export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: 'sm' | 'md'
  /**
   * Fill register. `brand` is the red default; `positive` is the green
   * semantic fill for "healthy amount remaining" meters (licence support
   * runway), matching the toneDot.positive family.
   */
  tone?: 'brand' | 'positive'
}

function Progress({
  className,
  value,
  max = 100,
  size = 'sm',
  tone = 'brand',
  ...props
}: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-full bg-muted',
        size === 'sm' ? 'h-1' : 'h-1.5',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all',
          tone === 'positive' ? 'bg-green-500' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { Progress }
