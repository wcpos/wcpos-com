'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MailCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { IconTile } from '@/components/ui/icon-tile'
import { TextLink, textLinkClassName } from '@/components/ui/text-link'
import { AuthCard } from '@/components/auth/auth-card'
import { SubmitButton } from '@/components/auth/auth-parts'


type ForgotPasswordErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'email_required'
  | 'reset_request_failed'

function isForgotPasswordErrorCode(
  value: unknown
): value is ForgotPasswordErrorCode {
  return (
    value === 'invalid_origin' ||
    value === 'rate_limited' ||
    value === 'email_required' ||
    value === 'reset_request_failed'
  )
}

export function ForgotPasswordPageClient() {
  const t = useTranslations('auth.forgotPassword')
  const tCommon = useTranslations('auth.common')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const getForgotPasswordErrorMessage = (errorCode: ForgotPasswordErrorCode) => {
    switch (errorCode) {
      case 'invalid_origin':
        return tCommon('apiErrors.invalid_origin')
      case 'rate_limited':
        return tCommon('apiErrors.rate_limited')
      case 'email_required':
        return tCommon('apiErrors.email_required')
      case 'reset_request_failed':
        return tCommon('genericError')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          isForgotPasswordErrorCode(data.errorCode)
            ? getForgotPasswordErrorMessage(data.errorCode)
            : tCommon('genericError')
        )
        return
      }

      setSubmitted(true)
    } catch {
      setError(tCommon('genericError'))
    } finally {
      setLoading(false)
    }
  }

  const footer = (
    <>
      {t('remembered')}{' '}
      <TextLink asChild>
        <Link href="/login">{tCommon('signIn')}</Link>
      </TextLink>
    </>
  )

  if (submitted) {
    // Never says whether the address has an account.
    return (
      <AuthCard
        status={
          <IconTile tone="positive">
            <MailCheck />
          </IconTile>
        }
        title={t('sentTitle')}
        description={
          <span role="status">
            {t.rich('submitted', {
              email,
              strong: (chunks) => (
                <strong className="font-medium text-foreground">{chunks}</strong>
              ),
            })}
          </span>
        }
        footer={footer}
      >
        <button
          type="button"
          className={`${textLinkClassName} self-center text-sm`}
          onClick={() => setSubmitted(false)}
        >
          {t('useDifferentEmail')}
        </button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('title')} description={t('description')} footer={footer}>
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
            className="h-10"
            placeholder={tCommon('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <SubmitButton busy={loading} busyLabel={t('submitting')}>
          {t('submit')}
        </SubmitButton>

        <p className="text-center text-sm text-muted-foreground">
          {t.rich('providerNote', {
            link: (chunks) => (
              <TextLink asChild className="underline">
                <Link href="/login">{chunks}</Link>
              </TextLink>
            ),
          })}
        </p>
      </form>
    </AuthCard>
  )
}
