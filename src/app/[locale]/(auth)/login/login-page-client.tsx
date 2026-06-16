'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function LoginPageClient({ discordEnabled }: { discordEnabled: boolean }) {
  return (
    <Suspense>
      <LoginPageInner discordEnabled={discordEnabled} />
    </Suspense>
  )
}

function LoginPageInner({ discordEnabled }: { discordEnabled: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    if (!oauthError) return ''
    if (oauthError === 'oauth_failed') return 'OAuth sign-in failed. Please try again or use email/password.'
    return oauthError
  })
  const [loading, setLoading] = useState(false)

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
        setError(data.error || 'Login failed')
        return
      }

      router.push(redirectTo)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Centering and page chrome live in the (auth) layout.
    <div className="w-full max-w-md">
      <Card className="shadow-lg shadow-black/5 dark:shadow-black/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
          <CardDescription>
            Sign in to your WCPOS account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* These are API routes that redirect to OAuth providers, not Next.js pages */}
          {/* eslint-disable @next/next/no-html-link-for-pages */}
          <div className="grid gap-2.5">
            <Button variant="outline" asChild>
              <a
                href="/api/auth/google"
                onClick={() => trackClientEvent('click_oauth_google')}
              >
                <GoogleMark className="mr-2 h-4 w-4" />
                Google
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="/api/auth/github"
                onClick={() => trackClientEvent('click_oauth_github')}
              >
                <GitHubMark className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            {discordEnabled && (
              <Button variant="outline" asChild>
                <a
                  href="/api/auth/discord"
                  onClick={() => trackClientEvent('click_oauth_discord')}
                >
                  <DiscordMark className="mr-2 h-4 w-4" />
                  Discord
                </a>
              </Button>
            )}
          </div>
          {/* eslint-enable @next/next/no-html-link-for-pages */}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
              className="text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
