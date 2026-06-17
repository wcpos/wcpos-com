import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * StatusBadge — a quiet status indicator: a small colored dot + label inside a
 * soft tinted pill. Replaces solid-red "Active / Expired" fills with something
 * calmer and more legible (design sweep 2026-06-16).
 *
 * This is PURELY presentational. `tone` is a visual register, not a license
 * status: callers map their domain status onto one of these tones. Do not
 * treat the tone names as canonical statuses.
 */
const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        positive:
          'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
        caution:
          'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        critical: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

const dotColor: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  positive: 'bg-green-500',
  caution: 'bg-amber-500',
  critical: 'bg-red-500',
  neutral: 'bg-muted-foreground',
}

export interface StatusBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Hide the leading dot (label-only pill). */
  hideDot?: boolean
}

function StatusBadge({
  className,
  tone,
  hideDot,
  children,
  ...props
}: StatusBadgeProps) {
  const resolved = tone ?? 'neutral'
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {!hideDot && (
        <span
          className={cn('size-1.5 rounded-full', dotColor[resolved])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
