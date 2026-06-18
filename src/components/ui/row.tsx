import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Flat, divider-led list primitives — the replacement for the nested
 * `rounded-lg border bg-muted/40` boxes the account area used to stack inside
 * cards. Structure comes from hairline dividers + whitespace, not enclosure
 * (see ADR 0009 / design sweep 2026-06-16).
 *
 * Usage:
 *   <DividedList>
 *     <Row>…</Row>
 *     <FieldRow label="Status" value={…} />
 *   </DividedList>
 */

/** Container that draws a hairline between each child (first child has none). */
const DividedList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('divide-y divide-border', className)} {...props} />
))
DividedList.displayName = 'DividedList'

/** A single horizontal row: content left, optional trailing content right. */
const Row = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-wrap items-center justify-between gap-3 py-4',
      className,
    )}
    {...props}
  />
))
Row.displayName = 'Row'

export interface FieldRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value: React.ReactNode
  /** A summed/total line: a top hairline + a heavier value (order totals). */
  emphasis?: boolean
}

/** A label ↔ value line. Label is muted; value sits to the right. */
const FieldRow = React.forwardRef<HTMLDivElement, FieldRowProps>(
  ({ className, label, value, emphasis, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 py-3 text-sm',
        emphasis && 'border-t border-border pt-3',
        className,
      )}
      {...props}
    >
      <div className={cn(emphasis ? 'font-medium text-foreground' : 'text-muted-foreground')}>
        {label}
      </div>
      <div
        className={cn(
          'text-right font-medium text-foreground',
          emphasis && 'text-base font-bold',
        )}
      >
        {value}
      </div>
    </div>
  ),
)
FieldRow.displayName = 'FieldRow'

export interface MediaRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading slot — an icon, IconTile or Avatar. */
  media?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Trailing slot — a badge, status or action button. */
  action?: React.ReactNode
}

/**
 * MediaRow — the media-object row: leading icon/avatar + a two-line body +
 * trailing action. One layout for the provider-connection, licence-machine and
 * Discord-member rows that were each built by hand.
 */
const MediaRow = React.forwardRef<HTMLDivElement, MediaRowProps>(
  ({ className, media, title, subtitle, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 py-3', className)}
      {...props}
    >
      {media && <div className="shrink-0">{media}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-sm text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  ),
)
MediaRow.displayName = 'MediaRow'

export { DividedList, Row, FieldRow, MediaRow }
