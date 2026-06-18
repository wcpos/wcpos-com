import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Amber micro-pill shared by the "Pro" / "Beta" markers. Defined once so the
// two markers can never drift apart again (they were byte-identical).
const amberPill =
  'border-0 rounded-full px-2 text-2xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-wcpos-red text-primary-foreground hover:bg-wcpos-red/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        warning:
          'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
        // Amber pill used for "Pro" / "Beta" markers on the marketing pages.
        pro: amberPill,
        beta: amberPill,
        // Tinted micro-pills for inline tags (Latest / Free·GPL etc.) — the
        // brand and muted registers, on the sub-xs type token.
        'brand-tint':
          'border-0 rounded-full px-2 text-2xs bg-wcpos-red/10 text-wcpos-red-accent',
        'muted-tint':
          'border-0 rounded-full px-2 text-2xs bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

// Renders a <span> (inline phrasing content) so a Badge is valid anywhere
// inline text is — including inside a heading. It is already inline-flex.
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
