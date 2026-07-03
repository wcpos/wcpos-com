'use client'

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
  if (failure.kind === 'payment_cancelled') {
    return (
      <Alert role="status" tone="neutral" title="Payment cancelled">
        <p>{failure.message}</p>
        {canSwitchMethod && (
          <p>You can also choose a different payment method below.</p>
        )}
      </Alert>
    )
  }

  if (failure.kind === 'payment_uncertain') {
    return (
      <Alert role="alert" tone="caution" title="Payment status unknown">
        <p>{failure.message}</p>
        <p>
          Please{' '}
          <Link
            href={supportHref(failure.reference)}
            className="font-medium underline underline-offset-2"
          >
            contact support
          </Link>{' '}
          and quote reference <span className="font-mono">{failure.reference}</span> —
          we will confirm whether your payment went through before you pay again.
        </p>
      </Alert>
    )
  }

  return (
    <Alert role="alert" tone="critical" title="Payment unsuccessful">
      <p>{failure.message}</p>
      <p>
        Your order details have been saved, so you can try again without starting over.
        {canSwitchMethod && ' You can also choose a different payment method below.'}
      </p>
      <p>
        Still stuck?{' '}
        <Link
          href={supportHref(failure.reference)}
          className="font-medium underline underline-offset-2"
        >
          Contact support
        </Link>{' '}
        and quote reference <span className="font-mono">{failure.reference}</span>.
      </p>
    </Alert>
  )
}

interface OrderPendingNoticeProps {
  failure: CheckoutFailure
}

/**
 * Full-page state for the half-completed checkout: payment was taken but the
 * order could not be created. Deliberately replaces the payment form so the
 * customer cannot pay a second time.
 */
export function OrderPendingNotice({ failure }: OrderPendingNoticeProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-xl mx-auto"
    >
      <AlertTriangle className={`h-16 w-16 mb-4 ${toneText.caution}`} />
      <h2 className="text-2xl font-bold mb-2">Payment received — order pending</h2>
      <p className="text-muted-foreground mb-2">
        Your payment went through, but we hit a problem while creating your order.
      </p>
      <p className="font-semibold mb-4">Please do not pay again.</p>
      <p className="text-sm text-muted-foreground mb-6">
        Contact support and quote reference{' '}
        <span className="font-mono font-medium">{failure.reference}</span> — we will
        finish setting up your order or refund your payment.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link href={supportHref(failure.reference)}>
            <LifeBuoy className="mr-2 h-4 w-4" />
            Contact support
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/licenses">Check my licenses</Link>
        </Button>
      </div>
    </div>
  )
}
