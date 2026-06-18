import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { toneSurface } from './status-tone'

/**
 * Alert — a block notice: the inline-panel counterpart to StatusBadge's pill.
 * One home for the `bg-destructive/10 p-3 text-destructive` form-error boxes and
 * amber caution panels that auth, account and checkout each hand-rolled.
 *
 * `tone` draws from the shared status-tone tints (one source of truth), so the
 * `critical` error register matches StatusBadge's critical. Pass `title` for a
 * heading + body, an `icon` for a leading mark, and/or an `action` slot; with
 * none of those it renders a plain tinted block (the common error-box case).
 */
const alertVariants = cva('rounded-md px-3 py-3 text-sm', {
  variants: {
    tone: {
      neutral: toneSurface.neutral,
      info: toneSurface.info,
      positive: toneSurface.positive,
      caution: toneSurface.caution,
      critical: toneSurface.critical,
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export interface AlertProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode
  title?: React.ReactNode
  action?: React.ReactNode
}

function Alert({
  className,
  tone,
  icon,
  title,
  action,
  children,
  ...props
}: AlertProps) {
  const structured = icon || title || action
  return (
    <div className={cn(alertVariants({ tone }), className)} {...props}>
      {structured ? (
        <div className="flex gap-2.5">
          {icon && (
            <span
              className="mt-0.5 shrink-0 [&_svg]:size-4"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            {title && <p className="font-medium">{title}</p>}
            {children}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export { Alert, alertVariants }
