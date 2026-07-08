'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { AlertTriangle, LifeBuoy } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toneText } from '@/components/ui/status-tone'
import type { CheckoutFailure } from './checkout-safety'

function supportHref(reference: string): string {
  return `/support?ref=${encodeURIComponent(reference)}`
}

interface CheckoutErrorNoticeProps {
  failure: CheckoutFailure
  /** Whether more than one payment method is available to switch to. */
  canSwitchMethod?: boolean
}

/**
 * Inline recovery notice for failed or cancelled payments.
 *
 * Rendered above the payment method tabs so the cart, email and payment form
 * all stay mounted — the customer can retry without starting over.
 * The `payment_uncertain` kind deliberately shows NO retry or switch-method
 * guidance: the charge may still complete (e.g. a Stripe intent in
 * 'processing'), so paying again via another method could double-charge.
 * The `order_pending` kind is intentionally NOT handled here; that state
 * replaces the whole checkout via OrderPendingNotice.
 */
export function CheckoutErrorNotice({
  failure,
  canSwitchMethod = false,
}: CheckoutErrorNoticeProps) {
  const t = useTranslations('pro.checkout.recovery')

  if (failure.kind === 'payment_cancelled') {
    return (
      <Alert role="status" tone="neutral" title={t('cancelled.title')}>
        <p>{failure.message}</p>
        {canSwitchMethod && (
          <p>{t('switchMethod')}</p>
        )}
      </Alert>
    )
  }

  if (failure.kind === 'payment_uncertain') {
    return (
      <Alert role="alert" tone="caution" title={t('unknown.title')}>
        <p>{failure.message}</p>
        <p>
          {t('unknown.prefix')}{' '}
          <Link
            href={supportHref(failure.reference)}
            className="font-medium underline underline-offset-2"
          >
            {t('contactSupportLower')}
          </Link>{' '}
          {t.rich('unknown.suffix', {
            reference: () => (
              <span className="font-mono">{failure.reference}</span>
            ),
          })}
        </p>
      </Alert>
    )
  }

  return (
    <Alert role="alert" tone="critical" title={t('unsuccessful.title')}>
      <p>{failure.message}</p>
      <p>
        {t('unsuccessful.saved')}
        {canSwitchMethod && ` ${t('switchMethod')}`}
      </p>
      <p>
        {t('unsuccessful.stuck')}{' '}
        <Link
          href={supportHref(failure.reference)}
          className="font-medium underline underline-offset-2"
        >
          {t('contactSupport')}
        </Link>{' '}
        {t.rich('unsuccessful.quote', {
          reference: () => (
            <span className="font-mono">{failure.reference}</span>
          ),
        })}
      </p>
    </Alert>
  )
}

interface OrderPendingNoticeProps {
  failure: CheckoutFailure
  onReset?: () => void
}

/**
 * Full-page state for the half-completed checkout: payment was taken but the
 * order could not be created. Deliberately replaces the payment form so the
 * customer cannot pay a second time.
 */
export function OrderPendingNotice({ failure, onReset }: OrderPendingNoticeProps) {
  const t = useTranslations('pro.checkout.recovery.orderPending')

  function handleReset() {
    if (
      window.confirm(t('resetConfirm'))
    ) {
      onReset?.()
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-xl mx-auto"
    >
      <AlertTriangle className={`h-16 w-16 mb-4 ${toneText.caution}`} />
      <h2 className="text-2xl font-bold mb-2">{t('title')}</h2>
      <p className="text-muted-foreground mb-2">
        {t('description')}
      </p>
      <p className="font-semibold mb-4">{t('doNotPayAgain')}</p>
      <p className="text-sm text-muted-foreground mb-6">
        {t.rich('supportInstructions', {
          reference: () => (
            <span className="font-mono font-medium">{failure.reference}</span>
          ),
        })}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link href={supportHref(failure.reference)}>
            <LifeBuoy className="mr-2 h-4 w-4" />
            {t('contactSupport')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/licenses">{t('checkLicenses')}</Link>
        </Button>
      </div>
      {onReset && (
        <div className="mt-6 max-w-md border-t pt-4 text-sm text-muted-foreground">
          <p className="mb-3">
            {t('resetHint')}
          </p>
          <Button type="button" variant="ghost" onClick={handleReset}>
            {t('resetButton')}
          </Button>
        </div>
      )}
    </div>
  )
}
