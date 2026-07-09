'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AlertTriangle, KeyRound, Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GitHubMark, GoogleMark } from '@/components/auth/provider-marks'
import { formatDateForLocale } from '@/lib/date-format'

export interface ConnectionProviderDetail {
  provider: string
  email: string | null
  name: string | null
  avatar: string | null
  handle: string | null
}

export interface ConnectionsCardProps {
  signIn: { provider: 'google' | 'github' | 'email'; email: string }
  /**
   * DB truth from GET /store/customers/me/auth-methods (may include
   * 'emailpass'). Absent when the backend doesn't expose the endpoint yet —
   * the card then degrades to the metadata-derived read-only display.
   * `providerDetails` says WHICH account each provider is linked to;
   * `emailpassPending` marks an emailpass identity whose reset link hasn't
   * been claimed: connected, but not yet a usable sign-in method.
   */
  methods?: {
    providers: string[]
    providerDetails?: ConnectionProviderDetail[]
    emailpassPending?: boolean
    emailpassUpdatedAt?: string | null
    emailpassReserved?: boolean
  } | null
}

type OAuthProvider = 'google' | 'github'

// Discord is deliberately absent: it is managed per-licence (ADR-0007),
// not as a profile connection.
const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'github']

type DisconnectErrorCode =
  | 'last_sign_in_method'
  | 'provider_not_connected'
  | 'read_only_inspection'
type PasswordErrorCode =
  | 'email_identity_reserved'
  | 'rate_limited'
  | 'read_only_inspection'

/** The card's mutable slice of the auth-methods summary; both actions
 * rewrite it wholesale from their response body. */
interface MethodsState {
  providers: string[]
  providerDetails: ConnectionProviderDetail[]
  emailpassPending: boolean
  emailpassUpdatedAt: string | null
  emailpassReserved: boolean
}

/** The provider identity's photo with the provider mark pinned to its
 * corner — "this Google account", not just "Google". */
function ProviderAvatar({
  provider,
  detail,
}: {
  provider: OAuthProvider
  detail: ConnectionProviderDetail | undefined
}) {
  return (
    <span className="relative flex-none">
      <Avatar className="h-10 w-10 border">
        {detail?.avatar ? <AvatarImage src={detail.avatar} alt="" /> : null}
        <AvatarFallback>
          {provider === 'google' ? (
            <GoogleMark className="h-5 w-5" />
          ) : (
            <GitHubMark className="h-5 w-5" />
          )}
        </AvatarFallback>
      </Avatar>
      {/* Pinned only when the photo row shows a real avatar; while the
          fallback disc already shows the mark, a second copy is noise. */}
      {detail?.avatar ? (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
          {provider === 'google' ? (
            <GoogleMark className="h-2.5 w-2.5" />
          ) : (
            <GitHubMark className="h-2.5 w-2.5" />
          )}
        </span>
      ) : null}
    </span>
  )
}

export function ConnectionsCard({ signIn, methods }: ConnectionsCardProps) {
  const t = useTranslations('account.profile')
  const locale = useLocale()
  const [state, setState] = useState<MethodsState | null>(
    methods
      ? {
          providers: methods.providers,
          providerDetails: methods.providerDetails ?? [],
          emailpassPending: methods.emailpassPending === true,
          emailpassUpdatedAt: methods.emailpassUpdatedAt ?? null,
          emailpassReserved: methods.emailpassReserved === true,
        }
      : null
  )
  const [confirmProvider, setConfirmProvider] = useState<OAuthProvider | null>(
    null
  )
  const [disconnecting, setDisconnecting] = useState(false)
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false)
  // The address the last setup email actually went to (exact identifier from
  // the backend); null until a send succeeds in this visit.
  const [passwordLinkSentTo, setPasswordLinkSentTo] = useState<string | null>(
    null
  )

  const providerName = (provider: OAuthProvider) =>
    provider === 'google' ? t('googleProvider') : t('githubProvider')

  const applyMethodsResponse = (data: {
    providers?: unknown
    providerDetails?: unknown
    emailpassPending?: unknown
    emailpassUpdatedAt?: unknown
    emailpassReserved?: unknown
  }) => {
    if (!Array.isArray(data.providers)) return
    setState((previous) => ({
      providers: (data.providers as unknown[]).filter(
        (provider): provider is string => typeof provider === 'string'
      ),
      providerDetails: Array.isArray(data.providerDetails)
        ? (data.providerDetails as ConnectionProviderDetail[])
        : (previous?.providerDetails ?? []),
      emailpassPending: data.emailpassPending === true,
      emailpassUpdatedAt:
        typeof data.emailpassUpdatedAt === 'string'
          ? data.emailpassUpdatedAt
          : null,
      emailpassReserved: data.emailpassReserved === true,
    }))
  }

  // `handleSendPasswordEmail` and `handleDisconnect` both rewrite the methods
  // state from their own response body, so overlapping runs would let
  // whichever settles last silently clobber the other's result. They are
  // mutually exclusive: each refuses to start while the other is in flight,
  // and each finally-block clears only its own flag.
  const handleSendPasswordEmail = async () => {
    if (sendingPasswordEmail || disconnecting) return
    setSendingPasswordEmail(true)
    try {
      const response = await fetch('/api/account/password', { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as {
        errorCode?: PasswordErrorCode
        sentTo?: string
        providers?: string[]
      }
      if (!response.ok) {
        if (data.errorCode === 'email_identity_reserved') {
          // A retry can never succeed — flip the row into its persistent
          // explanation instead of only toasting.
          setState((previous) =>
            previous ? { ...previous, emailpassReserved: true } : previous
          )
          return
        }
        toast.error(
          data.errorCode === 'rate_limited'
            ? t('apiErrors.rate_limited')
            : data.errorCode === 'read_only_inspection'
              ? t('apiErrors.read_only_inspection')
              : t('apiErrors.password_email_failed')
        )
        return
      }
      applyMethodsResponse(data)
      setPasswordLinkSentTo(
        typeof data.sentTo === 'string' && data.sentTo.length > 0
          ? data.sentTo
          : signIn.email
      )
      toast.success(t('passwordEmailSent'))
    } catch {
      toast.error(t('apiErrors.password_email_failed'))
    } finally {
      setSendingPasswordEmail(false)
    }
  }

  const handleDisconnect = async (provider: OAuthProvider) => {
    if (disconnecting || sendingPasswordEmail) return
    setDisconnecting(true)
    try {
      const response = await fetch(`/api/account/connections/${provider}`, {
        method: 'DELETE',
      })
      const data = (await response.json().catch(() => ({}))) as {
        errorCode?: DisconnectErrorCode
        providers?: string[]
      }
      if (!response.ok) {
        toast.error(
          data.errorCode === 'last_sign_in_method'
            ? t('apiErrors.last_sign_in_method')
            : data.errorCode === 'read_only_inspection'
              ? t('apiErrors.read_only_inspection')
              : t('apiErrors.disconnect_failed')
        )
        return
      }
      applyMethodsResponse(data)
      toast.success(t('disconnected', { provider: providerName(provider) }))
    } catch {
      toast.error(t('apiErrors.disconnect_failed'))
    } finally {
      setDisconnecting(false)
      setConfirmProvider(null)
    }
  }

  // Without DB truth (old backend / fetch failure), keep the previous
  // read-only single-row display.
  if (!state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('connectionsTitle')}</CardTitle>
          <CardDescription>{t('connectionsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center gap-4 py-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border bg-muted/50">
              {signIn.provider === 'google' ? (
                <GoogleMark className="h-5 w-5" />
              ) : signIn.provider === 'github' ? (
                <GitHubMark className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-none">
                {signIn.provider === 'google'
                  ? t('googleProvider')
                  : signIn.provider === 'github'
                    ? t('githubProvider')
                    : t('emailProvider')}
              </p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {signIn.email}
              </p>
            </div>
          </div>
          <Badge variant="success" className="break-all">
            {t('connectedAs', { account: signIn.email })}
          </Badge>
        </CardContent>
      </Card>
    )
  }

  const connectedOAuth = OAUTH_PROVIDERS.filter((provider) =>
    state.providers.includes(provider)
  )
  const detailFor = (provider: string) =>
    state.providerDetails.find((detail) => detail.provider === provider)
  // A pending emailpass identity (reset link sent, not yet claimed) is not a
  // password the customer can sign in with.
  const hasPassword =
    state.providers.includes('emailpass') && !state.emailpassPending
  // Server-guarded too; hiding the action avoids offering a disconnect that
  // can only fail with "set a password first". The guard counts USABLE
  // methods, so a pending emailpass identity doesn't unlock disconnects.
  const usableProviders = state.providers.filter(
    (provider) => provider !== 'emailpass' || hasPassword
  )
  const canDisconnect = usableProviders.length > 1

  // The setup link is "out there" when this visit sent one, or when a minted
  // identity from an earlier visit is still unclaimed.
  const passwordLinkPending =
    passwordLinkSentTo !== null || state.emailpassPending

  // Month + year is deliberate: precise enough to answer "do I have a
  // password and is it stale", without dating the exact moment.
  const passwordLastChanged =
    hasPassword && state.emailpassUpdatedAt
      ? formatDateForLocale(state.emailpassUpdatedAt, locale, {
          month: 'long',
          year: 'numeric',
        })
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('connectionsTitle')}</CardTitle>
        <CardDescription>{t('connectionsHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {connectedOAuth.map((provider) => {
            const detail = detailFor(provider)
            // "Google · Paul Kilmurray" / "GitHub · @kilbot" — and the email
            // gets its own line so it can never wrap mid-address.
            const who =
              provider === 'github' && detail?.handle
                ? `@${detail.handle}`
                : detail?.name
            return (
              <div key={provider} className="flex items-start gap-3 py-3">
                <ProviderAvatar provider={provider} detail={detail} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {providerName(provider)}
                    {who ? (
                      <span className="font-normal text-muted-foreground">
                        {' · '}
                        {who}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 break-all text-sm text-muted-foreground">
                    {detail?.email ?? t('oneClickSignIn')}
                  </p>
                  {signIn.provider === provider && (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {t('mostRecentSignIn')}
                    </p>
                  )}
                </div>
                {canDisconnect && (
                  <Button
                    type="button"
                    variant="ghost-destructive"
                    size="sm"
                    className="-mr-2 flex-none"
                    onClick={() => setConfirmProvider(provider)}
                    disabled={disconnecting || sendingPasswordEmail}
                  >
                    {t('disconnect')}
                  </Button>
                )}
              </div>
            )
          })}

          <div className="py-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border bg-muted/50">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {t('passwordTitle')}
                  {hasPassword && (
                    <Badge variant="success" className="ml-2 align-middle">
                      {t('passwordSetBadge')}
                    </Badge>
                  )}
                </p>
                <p className="mt-0.5 break-all text-sm text-muted-foreground">
                  {hasPassword
                    ? passwordLastChanged
                      ? t('passwordLastChanged', { date: passwordLastChanged })
                      : t('passwordReady')
                    : state.emailpassReserved
                      ? t('passwordNotSetShort')
                      : t('passwordNotSet', { email: signIn.email })}
                </p>
              </div>
              {!(state.emailpassReserved && !hasPassword) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-none"
                  onClick={handleSendPasswordEmail}
                  disabled={sendingPasswordEmail || disconnecting}
                >
                  {hasPassword ? t('changePassword') : t('setPassword')}
                </Button>
              )}
            </div>

            {/* The email is already owned by a different account: a retry can
                never succeed, so explain the dead end instead of a toast. */}
            {state.emailpassReserved && !hasPassword && (
              <div
                role="status"
                className="mt-3 flex gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 flex-none text-destructive"
                />
                <p className="min-w-0">
                  {t.rich('passwordReserved', {
                    email: signIn.email,
                    support: (chunks) => (
                      <a
                        href="mailto:support@wcpos.com"
                        className="font-medium underline underline-offset-2"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              </div>
            )}

            {/* Where the setup link went, with a resend — a toast alone
                vanishes before the customer has opened their inbox. */}
            {!hasPassword && !state.emailpassReserved && passwordLinkPending && (
              <div
                role="status"
                className="mt-3 flex gap-2.5 rounded-md border bg-muted/40 p-3 text-sm"
              >
                <Mail
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 flex-none text-muted-foreground"
                />
                <p className="min-w-0 text-muted-foreground">
                  <span className="break-all">
                    {t('passwordLinkSent', {
                      email: passwordLinkSentTo ?? signIn.email,
                    })}
                  </span>{' '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
                    onClick={handleSendPasswordEmail}
                    disabled={sendingPasswordEmail || disconnecting}
                  >
                    {t('passwordLinkResend')}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog
        open={confirmProvider !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmProvider(null)
        }}
      >
        {confirmProvider && (
          <DialogContent closeLabel={t('disconnectCancel')}>
            <DialogHeader>
              <DialogTitle>
                {t('disconnectTitle', {
                  provider: providerName(confirmProvider),
                })}
              </DialogTitle>
              <DialogDescription>
                {t('disconnectBody', {
                  provider: providerName(confirmProvider),
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmProvider(null)}
                disabled={disconnecting}
              >
                {t('disconnectCancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDisconnect(confirmProvider)}
                disabled={disconnecting}
              >
                {t('disconnect')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  )
}
