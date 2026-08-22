'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Change the address the account signs in with.
 *
 * The confirmation link goes to the NEW address, so this works even when the
 * current one bounces — which is the situation it mainly exists for. Nothing
 * changes until that link is followed, so the success state is deliberately
 * "check your inbox", not "done".
 *
 * `hasPassword` is false for OAuth-only accounts, which have no password to
 * ask for; the backend makes the same distinction and is the real gate.
 */
export function ChangeEmailCard({
  currentEmail,
  hasPassword,
}: {
  currentEmail: string
  hasPassword: boolean
}) {
  const t = useTranslations('account.profile.changeEmail')
  const tErrors = useTranslations('auth.common.apiErrors')
  const emailId = useId()
  const passwordId = useId()

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [backendRequiresPassword, setBackendRequiresPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requiresPassword = hasPassword || backendRequiresPassword

  function errorMessage(code: unknown): string {
    switch (code) {
      case 'email_undeliverable':
        return tErrors('email_undeliverable')
      case 'email_taken':
        return t('errors.taken')
      case 'same_email':
        return t('errors.same')
      case 'invalid_password':
        return t('errors.wrongPassword')
      case 'password_required':
        return t('errors.passwordRequired')
      case 'rate_limited':
        return tErrors('rate_limited')
      case 'read_only_inspection':
        return t('errors.readOnly')
      default:
        return t('errors.generic')
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/account/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...(requiresPassword ? { password } : {}),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          errorCode?: unknown
        }
        if (body.errorCode === 'password_required') {
          setBackendRequiresPassword(true)
        }
        setError(errorMessage(body.errorCode))
        return
      }

      // Success is "we sent it", not "it changed" — say so, or people will
      // assume the address already moved and stop looking for the email.
      setSentTo(email)
      setPassword('')
      toast.success(t('sentToast'))
    } catch {
      setError(t('errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="size-4 text-wcpos-red-accent" aria-hidden />
            {t('sentTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('sentBody', { email: sentTo })}
          </p>
          <p className="text-sm text-muted-foreground">{t('sentExpiry')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('description', { email: currentEmail })}
        </p>

        {!open ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            data-testid="change-email-open"
          >
            {t('cta')}
          </Button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={emailId}>{t('newEmailLabel')}</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {requiresPassword && (
              <div className="space-y-1.5">
                <Label htmlFor={passwordId}>{t('passwordLabel')}</Label>
                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('passwordHint')}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('sending') : t('submit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false)
                  setError(null)
                }}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
