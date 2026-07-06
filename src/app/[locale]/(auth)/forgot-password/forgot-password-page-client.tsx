'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
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

export function ForgotPasswordPageClient() {
  const t = useTranslations('auth.forgotPassword')
  const tCommon = useTranslations('auth.common')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
        setError(data.error || tCommon('genericError'))
        return
      }

      setSubmitted(true)
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
          {submitted ? (
            <Alert tone="positive" role="status">
              {t('submitted', { email })}
            </Alert>
          ) : (
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('submitting') : t('submit')}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('remembered')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {tCommon('signIn')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
