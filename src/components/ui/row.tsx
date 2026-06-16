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
}

/** A label ↔ value line. Label is muted; value sits to the right. */
const FieldRow = React.forwardRef<HTMLDivElement, FieldRowProps>(
  ({ className, label, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 py-3 text-sm',
        className,
      )}
      {...props}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  ),
)
FieldRow.displayName = 'FieldRow'

export { DividedList, Row, FieldRow }
