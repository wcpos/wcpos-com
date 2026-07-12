'use client'

import { useActionState } from 'react'
import {
  startImpersonationFormAction,
  type StartImpersonationResult,
} from './actions'

type ErrorCode = StartImpersonationResult['error']

export function AdminInspectForm({
  locale,
  submitLabel,
  emailPlaceholder,
  errorMessages,
}: {
  locale: string
  submitLabel: string
  emailPlaceholder: string
  errorMessages: Record<ErrorCode, string>
}) {
  const [state, formAction, pending] = useActionState(
    startImpersonationFormAction.bind(null, locale),
    null
  )

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder={emailPlaceholder}
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessages[state.error]}
        </p>
      )}
    </form>
  )
}
