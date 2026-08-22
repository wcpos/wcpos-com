'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { navigateAfterAuthChange } from '@/lib/safe-redirect'

/**
 * Lands from the confirmation email and completes the change.
 *
 * The link is routinely opened on a different device from the one that
 * started the change, so this page never assumes a session. It submits the
 * token on mount rather than asking for another click: the customer already
 * expressed intent by clicking the link in the email.
 */
export function ConfirmEmailPageClient() {
  return (
    <Suspense>
      <ConfirmEmailInner />
    </Suspense>
  )
}

type State =
  | { status: 'working' }
  | { status: 'done'; email: string }
  | { status: 'failed'; message: string }

function ConfirmEmailInner() {
  const t = useTranslations('auth.confirmEmail')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  // A missing token is knowable at render, so it is the initial state rather
  // than a setState inside the effect.
  const [state, setState] = useState<State>(() =>
    token
      ? { status: 'working' }
      : { status: 'failed', message: t('errors.missingToken') }
  )

  // React 18+ mounts effects twice in dev; the token is single-use, so a
  // second submit would report a spurious failure over a real success.
  const submitted = useRef(false)

  useEffect(() => {
    if (!token || submitted.current) return
    submitted.current = true

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/account/email/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = (await response.json().catch(() => ({}))) as {
          email?: unknown
          errorCode?: unknown
        }
        if (cancelled) return

        if (!response.ok) {
          setState({
            status: 'failed',
            message:
              body.errorCode === 'expired_token'
                ? t('errors.expired')
                : body.errorCode === 'change_failed'
                  ? t('errors.conflict')
                  : t('errors.invalid'),
          })
          return
        }

        setState({
          status: 'done',
          email: typeof body.email === 'string' ? body.email : '',
        })
      } catch {
        if (!cancelled) {
          setState({ status: 'failed', message: t('errors.generic') })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, t])

  if (state.status === 'working') {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm text-muted-foreground">{t('working')}</p>
      </div>
    )
  }

  if (state.status === 'failed') {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <XCircle
          className="mx-auto mb-4 size-8 text-destructive"
          aria-hidden
        />
        <h1 className="mb-2 text-xl font-semibold">{t('failedTitle')}</h1>
        <p role="alert" className="mb-6 text-sm text-muted-foreground">
          {state.message}
        </p>
        <Button asChild variant="outline">
          <Link href="/account/profile">{t('backToProfile')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <CheckCircle2
        className="mx-auto mb-4 size-8 text-wcpos-red-accent"
        aria-hidden
      />
      <h1 className="mb-2 text-xl font-semibold">{t('doneTitle')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('doneBody', { email: state.email })}
      </p>
      <Button
        type="button"
        onClick={() => {
          // The change moved the account identity, so any cached RSC payload
          // still describes the old address. A client-side transition would
          // keep rendering it — this must be a full document load.
          navigateAfterAuthChange('/account/profile', locale as never)
        }}
      >
        {t('continue')}
      </Button>
    </div>
  )
}
