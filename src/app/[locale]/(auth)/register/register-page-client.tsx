'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { sanitizeRedirectPath } from '@/lib/safe-redirect'
import { MIN_PASSWORD_LENGTH } from '@/lib/password-policy'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'


type RegisterErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'credentials_required'
  | 'password_too_short'
  | 'account_exists'
  | 'registration_failed'

function isRegisterErrorCode(value: unknown): value is RegisterErrorCode {
  return (
    value === 'invalid_origin' ||
    value === 'rate_limited' ||
    value === 'credentials_required' ||
    value === 'password_too_short' ||
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const getRegisterErrorMessage = (errorCode: RegisterErrorCode) => {
    switch (errorCode) {
      case 'invalid_origin':
        return tCommon('apiErrors.invalid_origin')
      case 'rate_limited':
        return tCommon('apiErrors.rate_limited')
      case 'credentials_required':
        return tCommon('apiErrors.credentials_required')
      case 'password_too_short':
        return tCommon('apiErrors.password_too_short', { min: MIN_PASSWORD_LENGTH })
      case 'account_exists':
        return t('accountExists')
      case 'registration_failed':
        return t('failed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, locale }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          isRegisterErrorCode(data.errorCode)
            ? getRegisterErrorMessage(data.errorCode)
            : t('failed')
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
          <CardTitle className="text-2xl tracking-tight">
            {t('title')}
          </CardTitle>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">{tCommon('firstName')}</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{tCommon('lastName')}</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

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
              <Label htmlFor="password">{tCommon('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                {tCommon('passwordHint', { min: MIN_PASSWORD_LENGTH })}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('submitting') : t('submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
              className="text-primary hover:underline"
            >
              {tCommon('signIn')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
