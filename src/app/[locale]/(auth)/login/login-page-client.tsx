'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { sanitizeRedirectPath } from '@/lib/safe-redirect'
import { DiscordMark, GitHubMark, GoogleMark } from '@/components/auth/provider-marks'
import { isOAuthErrorCode } from '@/lib/oauth-error-codes'

type LoginErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'credentials_required'
  | 'invalid_credentials'
  | 'login_failed'

function isLoginErrorCode(value: unknown): value is LoginErrorCode {
  return (
    value === 'invalid_origin' ||
    value === 'rate_limited' ||
    value === 'credentials_required' ||
    value === 'invalid_credentials' ||
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))
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
      case 'login_failed':
        return t('loginFailed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          isLoginErrorCode(data.errorCode)
            ? getLoginErrorMessage(data.errorCode)
            : t('loginFailed')
        )
        return
      }

      router.push(redirectTo)
    } catch {
      setError(tCommon('genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    // Centering and page chrome live in the (auth) layout.
    <div className="w-full max-w-md">
      <Card elevated>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl tracking-tight">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder={tCommon('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{tCommon('password')}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('submitting') : tCommon('signIn')}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t('oauthDivider')}
              </span>
            </div>
          </div>

          {/*
            Raw <a> (not next/link): these are /api/auth/* route handlers that
            server-redirect to external OAuth providers, not Next.js pages, so
            no-html-link-for-pages does not apply and no eslint-disable is needed
            (an unused directive gets stripped by `eslint --fix`, leaving `{}`).
          */}
          <div className="grid gap-2.5">
            <Button variant="outline" asChild>
              <a
                href={`/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`}
                onClick={() => trackClientEvent('click_oauth_google')}
              >
                <GoogleMark className="mr-2 h-4 w-4" />
                Google
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`/api/auth/github?redirect=${encodeURIComponent(redirectTo)}`}
                onClick={() => trackClientEvent('click_oauth_github')}
              >
                <GitHubMark className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`/api/auth/discord?redirect=${encodeURIComponent(redirectTo)}`}
                onClick={() => trackClientEvent('click_oauth_discord')}
              >
                <DiscordMark className="mr-2 h-4 w-4" />
                Discord
              </a>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
              className="text-primary hover:underline"
            >
              {tCommon('signUp')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
