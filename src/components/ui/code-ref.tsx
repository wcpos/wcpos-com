import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * CodeRef — a monospace machine identifier (licence key, order/support
 * reference, machine id). One size + tracking for the font-mono spans that
 * drifted across account, checkout and support, with select-all / break-all so
 * a long key is easy to copy and never overflows its row.
 */
const CodeRef = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <code
    ref={ref}
    className={cn('select-all break-all font-mono text-sm', className)}
    {...props}
  />
))
CodeRef.displayName = 'CodeRef'

export { CodeRef }
