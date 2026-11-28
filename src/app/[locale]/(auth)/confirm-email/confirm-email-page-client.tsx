'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { Link } from '@/i18n/navigation'
import { navigateAfterAuthChange } from '@/lib/safe-redirect'
import { AuthCard } from '@/components/auth/auth-card'

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
  const tErrors = useTranslations('auth.common.apiErrors')
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

    // Deliberately no cancellation flag. Under Strict Mode the first effect's
    // cleanup would set it, and the remounted effect exits on the ref guard —
    // so nothing would ever apply the response and the page would sit on
    // "working" forever. The ref alone prevents the double submit that would
    // spend this single-use token; a late setState is harmless.
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
        if (!response.ok) {
          setState({
            status: 'failed',
            message:
              body.errorCode === 'rate_limited'
                ? tErrors('rate_limited')
                : body.errorCode === 'expired_token'
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
        setState({ status: 'failed', message: t('errors.generic') })
      }
    })()
  }, [token, t, tErrors])

  if (state.status === 'working') {
    return (
      <AuthCard
        status={
          <IconTile>
            <LoaderCircle className="motion-safe:animate-spin" />
          </IconTile>
        }
        title={t('working')}
        description={t('workingBody')}
      />
    )
  }

  if (state.status === 'failed') {
    return (
      <AuthCard
        status={
          <IconTile tone="critical">
            <CircleX />
          </IconTile>
        }
        title={t('failedTitle')}
        description={<span role="alert">{state.message}</span>}
      >
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/account/profile">{t('backToProfile')}</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      status={
        <IconTile tone="positive">
          <CircleCheck />
        </IconTile>
      }
      title={t('doneTitle')}
      description={t.rich('doneBody', {
        email: state.email,
        strong: (chunks) => (
          <strong className="font-medium text-foreground">{chunks}</strong>
        ),
      })}
    >
      <Button
        type="button"
        variant="brand"
        size="lg"
        className="w-full"
        onClick={() => {
          // The change moved the account identity, so any cached RSC payload
          // still describes the old address. A client-side transition would
          // keep rendering it — this must be a full document load.
          navigateAfterAuthChange('/account/profile', locale as never)
        }}
      >
        {t('continue')}
      </Button>
    </AuthCard>
  )
}
