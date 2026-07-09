'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { KeyRound, Mail } from 'lucide-react'
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

export interface ConnectionsCardProps {
  signIn: { provider: 'google' | 'github' | 'email'; email: string }
  /**
   * DB truth from GET /store/customers/me/auth-methods (may include
   * 'emailpass'). Absent when the backend doesn't expose the endpoint yet —
   * the card then degrades to the metadata-derived read-only display.
   * `emailpassPending` marks an emailpass identity whose reset link hasn't
   * been claimed: connected, but not yet a usable sign-in method.
   */
  methods?: { providers: string[]; emailpassPending?: boolean } | null
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

function ProviderMark({ provider }: { provider: OAuthProvider | 'email' }) {
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md border">
      {provider === 'google' ? (
        <GoogleMark className="h-5 w-5" />
      ) : provider === 'github' ? (
        <GitHubMark className="h-5 w-5" />
      ) : (
        <Mail className="h-5 w-5 text-muted-foreground" />
      )}
    </span>
  )
}

export function ConnectionsCard({ signIn, methods }: ConnectionsCardProps) {
  const t = useTranslations('account.profile')
  const [providers, setProviders] = useState<string[] | null>(
    methods?.providers ?? null
  )
  const [emailpassPending, setEmailpassPending] = useState(
    methods?.emailpassPending === true
  )
  const [confirmProvider, setConfirmProvider] = useState<OAuthProvider | null>(
    null
  )
  const [disconnecting, setDisconnecting] = useState(false)
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false)

  const providerName = (provider: OAuthProvider) =>
    provider === 'google' ? t('googleProvider') : t('githubProvider')

  const handleSendPasswordEmail = async () => {
    setSendingPasswordEmail(true)
    try {
      const response = await fetch('/api/account/password', { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as {
        errorCode?: PasswordErrorCode
        providers?: string[]
        emailpassPending?: boolean
      }
      if (!response.ok) {
        toast.error(
          data.errorCode === 'email_identity_reserved'
            ? t('apiErrors.email_identity_reserved')
            : data.errorCode === 'rate_limited'
              ? t('apiErrors.rate_limited')
              : data.errorCode === 'read_only_inspection'
                ? t('apiErrors.read_only_inspection')
                : t('apiErrors.password_email_failed')
        )
        return
      }
      if (Array.isArray(data.providers)) {
        setProviders(data.providers)
        setEmailpassPending(data.emailpassPending === true)
      }
      toast.success(t('passwordEmailSent'))
    } catch {
      toast.error(t('apiErrors.password_email_failed'))
    } finally {
      setSendingPasswordEmail(false)
    }
  }

  const handleDisconnect = async (provider: OAuthProvider) => {
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
      if (Array.isArray(data.providers)) setProviders(data.providers)
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
  if (!providers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('connectionsTitle')}</CardTitle>
          <CardDescription>{t('connectionsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center gap-4 py-3">
            <ProviderMark
              provider={signIn.provider === 'email' ? 'email' : signIn.provider}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-none">
                {signIn.provider === 'google'
                  ? t('googleProvider')
                  : signIn.provider === 'github'
                    ? t('githubProvider')
                    : t('emailProvider')}
              </p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {signIn.provider === 'google'
                  ? t('googleDescription')
                  : signIn.provider === 'github'
                    ? t('githubDescription')
                    : t('emailDescription')}
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
    providers.includes(provider)
  )
  // A pending emailpass identity (reset link sent, not yet claimed) is not a
  // password the customer can sign in with.
  const hasPassword = providers.includes('emailpass') && !emailpassPending
  // Server-guarded too; hiding the action avoids offering a disconnect that
  // can only fail with "set a password first". The guard counts USABLE
  // methods, so a pending emailpass identity doesn't unlock disconnects.
  const usableProviders = providers.filter(
    (provider) => provider !== 'emailpass' || hasPassword
  )
  const canDisconnect = usableProviders.length > 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('connectionsTitle')}</CardTitle>
        <CardDescription>{t('connectionsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="divide-y">
          {connectedOAuth.map((provider) => (
            <div key={provider} className="flex items-start gap-4 py-3">
              <ProviderMark provider={provider} />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-none">
                  {providerName(provider)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {provider === 'google'
                    ? t('googleDescription')
                    : t('githubDescription')}
                </p>
                {canDisconnect && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 mt-1 h-7 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmProvider(provider)}
                  >
                    {t('disconnect')}
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-start gap-4 py-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md border">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-none">{t('emailProvider')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasPassword ? t('passwordReady') : t('passwordMissing')}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 mt-1 h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={handleSendPasswordEmail}
                disabled={sendingPasswordEmail}
              >
                {hasPassword ? t('changePassword') : t('setPassword')}
              </Button>
            </div>
          </div>
        </div>

        <Badge variant="success" className="break-all">
          {t('connectedAs', { account: signIn.email })}
        </Badge>
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
                {t('disconnectTitle', { provider: providerName(confirmProvider) })}
              </DialogTitle>
              <DialogDescription>
                {t('disconnectBody', { provider: providerName(confirmProvider) })}
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
