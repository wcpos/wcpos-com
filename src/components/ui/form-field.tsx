import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

/**
 * FormField — the label + control (+ optional hint) group every form
 * hand-rolled as `<div className="space-y-*"><Label/><Input/></div>` (6× in
 * the checkout billing step, 12× in the account profile form, at two drifting
 * spacings). The caller still owns the control and its `id`; pass the same id
 * as `htmlFor` so the label is associated.
 */
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  htmlFor: string
  /** Muted helper line rendered under the control. */
  hint?: React.ReactNode
}

function FormField({
  label,
  htmlFor,
  hint,
  className,
  children,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export { FormField }
