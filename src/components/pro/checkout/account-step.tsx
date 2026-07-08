'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/navigation'

/**
 * Inline account step: new customers create their account without leaving
 * checkout; customers whose email already exists are flipped into sign-in
 * mode (the register API's 409 ACCOUNT_EXISTS is the discriminator, so
 * there is no separate "does this email exist" round-trip).
 *
 * OAuth stays available via the login page (with a redirect back here) —
 * checkout does not re-implement the OAuth dance.
 */
interface AccountStepProps {
  /** Path (with query) of the current checkout for OAuth redirect-back. */
  checkoutPath: string
  onAuthenticated: (email: string) => void
}

type Mode = 'register' | 'signin'

export function AccountStep({ checkoutPath, onAuthenticated }: AccountStepProps) {
  const locale = useLocale()
  const t = useTranslations('pro.checkout.account')
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const isCreatingAccount = mode === 'register'
      const endpoint =
        isCreatingAccount ? '/api/auth/register' : '/api/auth/login'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCreatingAccount ? { email, password, locale } : { email, password }
        ),
      })

      if (response.ok) {
        onAuthenticated(email)
        return
      }

      if (mode === 'register' && response.status === 409) {
        // Account already exists — same form, sign-in semantics.
        setMode('signin')
        setError(null)
        return
      }

      const body = await response.json().catch(() => ({}))
      if (mode === 'signin' && response.status === 401) {
        // The account exists but this password doesn't work — which is also
        // exactly what an OAuth-only account (Google/GitHub/Discord, no
        // password) looks like. Point at both exits, not just "check your
        // password", or OAuth customers dead-end here.
        setError(t('errors.passwordFailed'))
        return
      }
      setError(
        typeof body.error === 'string'
          ? body.error
          : mode === 'register'
            ? t('errors.createFailed')
            : t('errors.signInFailed')
      )
    } catch {
      setError(t('errors.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const loginHref = {
    pathname: '/login',
    query: { redirect: checkoutPath },
  } as const

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="account-step-form">
      {mode === 'signin' && (
        <p
          data-testid="account-exists-notice"
          className="rounded-md bg-muted px-3 py-2 text-sm"
        >
          {t('existingAccountNotice')}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="checkout-email">{t('emailLabel')}</Label>
        <Input
          id="checkout-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (mode === 'signin') setMode('register')
          }}
          placeholder="you@yourstore.com"
        />
        {mode === 'register' && (
          <p className="text-xs text-muted-foreground">
            {t('emailHint')}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="checkout-password">{t('passwordLabel')}</Label>
        <Input
          id="checkout-password"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
          minLength={mode === 'register' ? 8 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? t('submitting')
          : mode === 'register'
            ? t('createContinue')
            : t('signInContinue')}
      </Button>

      <p className="text-sm text-muted-foreground">
        {t('oauthPrompt')}{' '}
        <Link href={loginHref} className="underline underline-offset-4">
          {t('oauthLink')}
        </Link>{' '}
        {t('oauthSuffix')}
      </p>
    </form>
  )
}
