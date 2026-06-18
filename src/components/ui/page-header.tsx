import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * PageHeader — the in-app page title block (the account-area counterpart to the
 * marketing SectionHeading). Replaces the byte-identical
 * `<h1 class="text-2xl font-bold tracking-tight">` + muted lede that every
 * account page repeated. Optional right-aligned `actions` slot.
 */
export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  lede?: React.ReactNode
  actions?: React.ReactNode
}

function PageHeader({
  className,
  title,
  lede,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4',
        className,
      )}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {lede && <p className="text-sm text-muted-foreground">{lede}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}

export { PageHeader }
