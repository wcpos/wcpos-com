'use client'

import * as React from 'react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, CircleAlert, LoaderCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextLink } from '@/components/ui/text-link'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { cn } from '@/lib/utils'
import { DiscordMark, GitHubMark, GoogleMark } from './provider-marks'

const PROVIDERS = [
  { id: 'google', name: 'Google', Mark: GoogleMark },
  { id: 'github', name: 'GitHub', Mark: GitHubMark },
  { id: 'discord', name: 'Discord', Mark: DiscordMark },
] as const

/**
 * The three one-click sign-ins. Raw <a> (not next/link): these are
 * /api/auth/* route handlers that server-redirect to the OAuth provider.
 * While the email form submits they take the disabled look and stop taking
 * clicks.
 */
export function ProviderButtons({
  redirectTo,
  disabled = false,
}: {
  redirectTo: string
  disabled?: boolean
}) {
  const locale = useLocale()
  const t = useTranslations('auth.common')
  return (
    <div className="grid gap-2.5">
      {PROVIDERS.map(({ id, name, Mark }) => (
        <Button
          key={id}
          variant="outline"
          size="lg"
          className={cn('w-full', disabled && 'pointer-events-none opacity-50')}
          asChild
        >
          <a
            href={`/api/auth/${id}?locale=${encodeURIComponent(locale)}&redirect=${encodeURIComponent(redirectTo)}`}
            onClick={() => trackClientEvent(`click_oauth_${id}`)}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : undefined}
          >
            <Mark />
            {t('continueWith', { provider: name })}
          </a>
        </Button>
      ))}
    </div>
  )
}

/** "or sign in with email": a hairline either side of a sentence-case label. */
export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

/**
 * Password input with a muted Show / Hide control inside its right edge. The
 * field reserves room for the longer of the two words in the active locale.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const t = useTranslations('auth.common')
  const [visible, setVisible] = useState(false)
  const show = t('passwordShow')
  const hide = t('passwordHide')
  const wide = Math.max(show.length, hide.length) > 5
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('h-10', wide ? 'pr-26' : 'pr-16', className)}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? hide : show}
      </button>
    </div>
  )
}

/**
 * The 14px line under a field in error: the critical Alert's text colour, a
 * leading circle-alert, and links that inherit the colour, underlined.
 */
export function FieldError({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex gap-1.5 text-sm font-medium text-red-700 dark:text-red-400"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** A link inside a status message: takes the tone colour, underlined. */
export const statusLinkClassName = 'font-medium underline underline-offset-4'

/**
 * The brand submit button. While busy it keeps full strength with a spinner
 * (still `disabled`, so a second press or Enter cannot resubmit); the faded
 * look is left for a button that is truly unavailable.
 */
export function SubmitButton({
  busy,
  disabled = false,
  busyLabel,
  children,
}: {
  busy: boolean
  disabled?: boolean
  busyLabel: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="submit"
      variant="brand"
      size="lg"
      className={cn('w-full', busy && 'disabled:opacity-100')}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
    >
      {busy && (
        <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
      )}
      {busy ? busyLabel : children}
    </Button>
  )
}

/** The two lines under the sign-in and register cards. */
export function AuthHelpLinks({ help }: { help: string }) {
  const t = useTranslations('auth.common')
  return (
    <div className="mt-4 space-y-1.5 text-center text-sm text-muted-foreground">
      <p>
        {t('freePlugin')}{' '}
        <TextLink asChild>
          <Link href="/downloads" className="inline-flex items-center gap-1">
            {t('downloadWcpos')}
            <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </TextLink>
      </p>
      <p>
        {help}{' '}
        <TextLink asChild>
          <Link href="/support">{t('contactSupport')}</Link>
        </TextLink>
      </p>
    </div>
  )
}
