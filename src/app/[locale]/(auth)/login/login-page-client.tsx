'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { CircleAlert } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { TextLink } from '@/components/ui/text-link'
import { AuthCard } from '@/components/auth/auth-card'
import {
  AuthDivider,
  AuthHelpLinks,
  PasswordInput,
  ProviderButtons,
  SubmitButton,
  statusLinkClassName,
} from '@/components/auth/auth-parts'
import { navigateAfterAuthChange, sanitizeRedirectPath } from '@/lib/safe-redirect'
import { isOAuthErrorCode } from '@/lib/oauth-error-codes'

type LoginErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'credentials_required'
  | 'invalid_credentials'
  | 'account_security_hold'
  | 'login_failed'

function isLoginErrorCode(value: unknown): value is LoginErrorCode {
  return (
    value === 'invalid_origin' ||
    value === 'rate_limited' ||
    value === 'credentials_required' ||
    value === 'invalid_credentials' ||
    value === 'account_security_hold' ||
    value === 'login_failed'
  )
}

export function LoginPageClient() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('auth.common')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))
  const fromCheckout = redirectTo.startsWith('/pro/checkout')
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    if (!oauthError) return ''
    if (isOAuthErrorCode(oauthError)) {
      return t(`oauthErrors.${oauthError}`)
    }
    return t('oauthFailed')
  })
  // invalid_credentials draws its own Alert (title, reset link, provider hint).
  const [badCredentials, setBadCredentials] = useState(false)
  const [loading, setLoading] = useState(false)

  const getLoginErrorMessage = (errorCode: LoginErrorCode) => {
    switch (errorCode) {
      case 'invalid_origin':
        return tCommon('apiErrors.invalid_origin')
      case 'rate_limited':
        return tCommon('apiErrors.rate_limited')
      case 'credentials_required':
        return tCommon('apiErrors.credentials_required')
      case 'invalid_credentials':
        return tCommon('apiErrors.invalid_credentials')
      case 'account_security_hold':
        return tCommon('apiErrors.account_security_hold')
      case 'login_failed':
        return t('loginFailed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBadCredentials(false)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errorCode === 'invalid_credentials') {
          setBadCredentials(true)
        } else {
          setError(
            isLoginErrorCode(data.errorCode)
              ? getLoginErrorMessage(data.errorCode)
              : t('loginFailed')
          )
        }
        setLoading(false)
        return
      }

      // Deliberately leaves `loading` true: the full document load takes a
      // beat, and re-enabling the button here would open a double-submit
      // window while the browser unloads.
      navigateAfterAuthChange(redirectTo, locale)
    } catch {
      setError(tCommon('genericError'))
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title={fromCheckout ? t('checkoutTitle') : t('title')}
      description={fromCheckout ? t('checkoutDescription') : t('description')}
      footer={
        <>
          {t('noAccount')}{' '}
          <TextLink asChild>
            <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`}>
              {t('createAccount')}
            </Link>
          </TextLink>
        </>
      }
      below={<AuthHelpLinks help={t('trouble')} />}
    >
      <ProviderButtons redirectTo={redirectTo} disabled={loading} />
      <AuthDivider>{t('oauthDivider')}</AuthDivider>

      <form onSubmit={handleSubmit} className="space-y-4">
        {badCredentials && (
          <Alert
            tone="critical"
            role="alert"
            icon={<CircleAlert />}
            title={t('badCredentialsTitle')}
          >
            <p>
              {t.rich('badCredentialsRetry', {
                link: (chunks) => (
                  <Link href="/forgot-password" className={statusLinkClassName}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <p>{t('badCredentialsProvider')}</p>
          </Alert>
        )}
        {error && (
          <Alert tone="critical" role="alert">
            {error}
          </Alert>
        )}

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
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">{tCommon('password')}</Label>
            <TextLink asChild className="text-sm">
              <Link href="/forgot-password">{t('forgotPassword')}</Link>
            </TextLink>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <SubmitButton busy={loading} busyLabel={t('submitting')}>
          {tCommon('signIn')}
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
