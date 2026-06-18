import * as React from 'react'
import { cn } from '@/lib/utils'
import { IconTile } from './icon-tile'

/**
 * EmptyState — the centred "nothing here yet" / error block: a round IconTile
 * disc + title + muted body + optional action. Replaces the
 * `flex flex-col items-center py-12 text-center` recipe hand-rolled across the
 * licences, orders and account-error views.
 */
export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  /** `caution` tints the disc amber for an error/blocked state. */
  tone?: 'muted' | 'caution'
}

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  tone = 'muted',
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center py-12 text-center', className)}
      {...props}
    >
      <IconTile size="lg" shape="round" tone={tone} className="mb-3">
        {icon}
      </IconTile>
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { EmptyState }
