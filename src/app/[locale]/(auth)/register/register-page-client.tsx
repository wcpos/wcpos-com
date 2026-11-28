'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { TriangleAlert } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { TextLink } from '@/components/ui/text-link'
import { useTurnstileGate } from '@/components/auth/use-turnstile-gate'
import { AuthCard } from '@/components/auth/auth-card'
import {
  AuthDivider,
  AuthHelpLinks,
  FieldError,
  PasswordInput,
  ProviderButtons,
  SubmitButton,
  statusLinkClassName,
} from '@/components/auth/auth-parts'
import { navigateAfterAuthChange, sanitizeRedirectPath } from '@/lib/safe-redirect'
import { MIN_PASSWORD_LENGTH } from '@/lib/password-policy'
import { getPostHogSessionId } from '@/lib/analytics/posthog-browser'

type RegisterErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'rate_limit_unavailable'
  | 'bot_check_failed'
  | 'credentials_required'
  | 'password_too_short'
  | 'email_undeliverable'
  | 'account_exists'
  | 'registration_failed'

function isRegisterErrorCode(value: unknown): value is RegisterErrorCode {
  return (
    value === 'invalid_origin' ||
    value === 'rate_limited' ||
    value === 'rate_limit_unavailable' ||
    value === 'bot_check_failed' ||
    value === 'credentials_required' ||
    value === 'password_too_short' ||
    value === 'email_undeliverable' ||
    value === 'account_exists' ||
    value === 'registration_failed'
  )
}

export function RegisterPageClient() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  )
}

function RegisterPageInner() {
  const locale = useLocale()
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('auth.common')
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  // account_exists and password_too_short show under their field instead of
  // as an Alert; `count` is the length of the password that was refused.
  const [fieldError, setFieldError] = useState<
    { field: 'email' } | { field: 'password'; count: number } | null
  >(null)
  const [loading, setLoading] = useState(false)
  const turnstile = useTurnstileGate()

  const getRegisterErrorMessage = (errorCode: RegisterErrorCode) => {
    switch (errorCode) {
      case 'invalid_origin':
        return tCommon('apiErrors.invalid_origin')
      case 'rate_limited':
        return tCommon('apiErrors.rate_limited')
      case 'rate_limit_unavailable':
        return tCommon('apiErrors.rate_limit_unavailable')
      case 'bot_check_failed':
        return tCommon('apiErrors.bot_check_failed')
      case 'credentials_required':
        return tCommon('apiErrors.credentials_required')
      case 'password_too_short':
        return tCommon('apiErrors.password_too_short', { min: MIN_PASSWORD_LENGTH })
      case 'email_undeliverable':
        return tCommon('apiErrors.email_undeliverable')
      case 'account_exists':
        return t('accountExists')
      case 'registration_failed':
        return t('failed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setFieldError(null)
    setLoading(true)

    try {
      const sessionId = getPostHogSessionId()
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          locale,
          ...(sessionId ? { sessionId } : {}),
          turnstileToken: turnstile.token ?? '',
        }),
      })

      if (!response.ok) {
        turnstile.reset()
        const data = await response.json().catch(() => ({}))
        if (data.errorCode === 'account_exists') {
          setFieldError({ field: 'email' })
        } else if (data.errorCode === 'password_too_short') {
          setFieldError({ field: 'password', count: password.length })
        } else {
          setError(
            isRegisterErrorCode(data.errorCode)
              ? getRegisterErrorMessage(data.errorCode)
              : t('failed')
          )
        }
        setLoading(false)
        return
      }

      // Deliberately leaves `loading` true — see navigateAfterAuthChange for
      // why this must be a full document navigation.
      navigateAfterAuthChange(redirectTo, locale)
    } catch {
      setError(tCommon('genericError'))
      setLoading(false)
    }
  }

  const passwordError = fieldError?.field === 'password' ? fieldError : null
  const passwordNote = passwordError ? 'password-error' : 'password-hint'

  return (
    <AuthCard
      title={t('title')}
      description={t('description')}
      footer={
        <>
          {t('hasAccount')}{' '}
          <TextLink asChild>
            <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
              {tCommon('signIn')}
            </Link>
          </TextLink>
        </>
      }
      below={<AuthHelpLinks help={t('needHelp')} />}
    >
      <ProviderButtons redirectTo={redirectTo} disabled={loading} />
      <AuthDivider>{t('oauthDivider')}</AuthDivider>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert tone="critical" role="alert">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">{tCommon('firstName')}</Label>
            <Input
              id="firstName"
              type="text"
              className="h-10"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{tCommon('lastName')}</Label>
            <Input
              id="lastName"
              type="text"
              className="h-10"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{tCommon('email')}</Label>
          <Input
            id="email"
            type="email"
            className="h-10"
            placeholder={tCommon('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            aria-invalid={fieldError?.field === 'email' || undefined}
            aria-describedby={
              fieldError?.field === 'email' ? 'email-error' : undefined
            }
          />
          {fieldError?.field === 'email' && (
            <FieldError id="email-error">
              {t.rich('accountExists', {
                signIn: (chunks) => (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
                    className={statusLinkClassName}
                  >
                    {chunks}
                  </Link>
                ),
                reset: (chunks) => (
                  <Link href="/forgot-password" className={statusLinkClassName}>
                    {chunks}
                  </Link>
                ),
              })}
            </FieldError>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{tCommon('password')}</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={passwordNote}
          />
          {passwordError ? (
            <FieldError id={passwordNote}>
              {t('passwordTooShort', {
                min: MIN_PASSWORD_LENGTH,
                count: passwordError.count,
              })}
            </FieldError>
          ) : (
            <p id={passwordNote} className="text-xs text-muted-foreground">
              {tCommon('passwordHint', { min: MIN_PASSWORD_LENGTH })}
            </p>
          )}
        </div>

        {turnstile.failed && (
          <Alert
            tone="caution"
            role="status"
            icon={<TriangleAlert />}
            title={t('turnstileTitle')}
          >
            <p>{t('turnstileBody')}</p>
          </Alert>
        )}

        <SubmitButton
          busy={loading}
          disabled={turnstile.verifying}
          busyLabel={t('submitting')}
        >
          {t('submit')}
        </SubmitButton>

        {turnstile.widget}
      </form>
    </AuthCard>
  )
}
