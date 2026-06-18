import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { toneSurface, toneDot } from './status-tone'

/**
 * StatusBadge — a quiet status indicator: a small colored dot + label inside a
 * soft tinted pill. Replaces solid-red "Active / Expired" fills with something
 * calmer and more legible (design sweep 2026-06-16).
 *
 * This is PURELY presentational. `tone` is a visual register, not a license
 * status: callers map their domain status onto one of these tones. Do not
 * treat the tone names as canonical statuses. The tint families come from the
 * shared `status-tone` module (one source of truth, also used by Alert).
 */
const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        positive: toneSurface.positive,
        caution: toneSurface.caution,
        critical: toneSurface.critical,
        neutral: toneSurface.neutral,
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

const dotColor: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  positive: toneDot.positive,
  caution: toneDot.caution,
  critical: toneDot.critical,
  neutral: toneDot.neutral,
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
