'use client'

import { Check } from 'lucide-react'

export type CheckoutStepId = 'account' | 'billing' | 'payment'

/**
 * Collapsing step container for the checkout: the active step shows its
 * form, completed steps collapse to a ✓ summary line with Edit, and future
 * steps render as inert headers. Purely presentational — ordering and
 * which steps are editable is the parent's business.
 */
export function StepShell({
  index,
  title,
  summary,
  state,
  onEdit,
  editLabel,
  children,
}: {
  index: number
  title: string
  /** One-line recap shown when the step is complete. */
  summary?: string
  state: 'done' | 'active' | 'todo'
  /** Present only when a completed step can be reopened. */
  onEdit?: () => void
  editLabel: string
  children: React.ReactNode
}) {
  return (
    <div
      data-testid={`checkout-step-${index}`}
      data-step-state={state}
      className={`rounded-xl border ${
        state === 'active' ? 'bg-card shadow-sm' : 'bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            state === 'done'
              ? 'bg-green-500 text-white'
              : state === 'active'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {state === 'done' ? <Check className="h-3.5 w-3.5" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium ${state === 'active' ? '' : 'text-muted-foreground'}`}
          >
            {title}
          </p>
          {state === 'done' && summary && (
            <p className="truncate text-sm text-muted-foreground">{summary}</p>
          )}
        </div>
        {state === 'done' && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            // Multiple steps render an "Edit" control — disambiguate for
            // screen readers navigating by button.
            aria-label={`${editLabel} ${title}`}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            {editLabel}
          </button>
        )}
      </div>
      {state === 'active' && <div className="border-t px-5 py-5">{children}</div>}
    </div>
  )
}
