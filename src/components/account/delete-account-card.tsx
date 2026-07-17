'use client'

import { useId, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { navigateAfterAuthChange } from '@/lib/safe-redirect'
import type { Locale } from '@/i18n/config'

/**
 * Danger zone: permanently delete the account.
 *
 * The confirm dialog requires re-typing the account email (locale-neutral,
 * unlike a translated "DELETE" keyword) before the destructive button arms.
 * On success the backend session is already gone, so navigation MUST be a
 * full document load (navigateAfterAuthChange) — a client-side transition
 * would keep rendering RSC payloads for the deleted identity.
 */
export function DeleteAccountCard({ email }: { email: string }) {
  const t = useTranslations('account.profile')
  const locale = useLocale() as Locale
  const inputId = useId()

  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmed =
    confirmText.trim().toLowerCase() === email.trim().toLowerCase()

  function close() {
    if (deleting) return
    setOpen(false)
    setConfirmText('')
  }

  async function handleDelete() {
    if (!confirmed || deleting) return
    setDeleting(true)
    try {
      const response = await fetch('/api/account', { method: 'DELETE' })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          errorCode?: string
        } | null
        const code = body?.errorCode
        toast.error(
          code === 'read_only_inspection' || code === 'rate_limited'
            ? t(`apiErrors.${code}`)
            : t('apiErrors.account_deletion_failed')
        )
        setDeleting(false)
        return
      }
      // The account and session are gone; leave `deleting` on so the dialog
      // stays inert during the full-page navigation.
      navigateAfterAuthChange('/', locale)
    } catch {
      toast.error(t('apiErrors.account_deletion_failed'))
      setDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 text-destructive"
          />
          {t('deleteAccountTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-prose text-sm text-muted-foreground">
          {t('deleteAccountHint')}
        </p>
        <Button
          type="button"
          variant="ghost-destructive"
          size="sm"
          className="flex-none self-start"
          onClick={() => setOpen(true)}
        >
          {t('deleteAccountButton')}
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <DialogContent closeLabel={t('deleteAccountCancel')}>
          <DialogHeader>
            <DialogTitle>{t('deleteAccountDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteAccountDialogBody')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('deleteAccountConsequenceSignIn')}</li>
              <li>{t('deleteAccountConsequenceLicenses')}</li>
              <li>{t('deleteAccountConsequenceOrders')}</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor={inputId} className="text-foreground">
                {t('deleteAccountConfirmLabel', { email })}
              </Label>
              <Input
                id={inputId}
                type="email"
                autoComplete="off"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={email}
                disabled={deleting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={deleting}
            >
              {t('deleteAccountCancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmed || deleting}
            >
              {deleting
                ? t('deleteAccountDeleting')
                : t('deleteAccountConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
