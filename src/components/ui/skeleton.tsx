import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Pulsing placeholder block for loading states. Drawn as a foreground tint
 * rather than the muted surface so it reads on tinted panels too (the
 * selected plan card), the same everywhere it is used.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-foreground/10 dark:bg-foreground/15', className)}
      {...props}
    />
  )
}

export { Skeleton }
