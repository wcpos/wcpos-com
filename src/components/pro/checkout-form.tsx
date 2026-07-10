'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { completeCart } from './complete-cart'
import {
  completeProviderConfirmedCheckout,
  createPaymentFailure,
  createUncertainPaymentFailure,
  mapStripeErrorMessage,
  type CheckoutFailure,
} from './checkout-safety'
import { useCheckoutFailureMessages } from './checkout/use-checkout-failure-messages'
import { checkoutSuccessReturnUrl } from './checkout/return-url'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

interface CheckoutFormProps {
  cartId: string
  amount: number
  currency: string
  experiment: string
  experimentVariant: ProCheckoutVariant
  onAttempt?: () => Promise<void> | void
  onSuccess: (orderId: string) => void
  /**
   * Reports payment failures to the parent (null clears a previous failure
   * when the customer retries). Failure messages are already customer-safe.
   */
  onFailure: (failure: CheckoutFailure | null) => void
  /**
   * Mirrors the confirm-in-flight state to the parent so it can lock the
   * rest of the checkout (billing Edit, method switching) while a charge
   * may be happening.
   */
  onProcessingChange?: (processing: boolean) => void
}

export function CheckoutForm({
  cartId,
  amount,
  currency,
  experiment,
  experimentVariant,
  onAttempt,
  onSuccess,
  onFailure,
  onProcessingChange,
}: CheckoutFormProps) {
  const locale = useLocale()
  const t = useTranslations('pro.checkout.payment')
  const failureMessages = useCheckoutFailureMessages()
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    onProcessingChange?.(true)
    onFailure(null)

    try {
      try {
        await onAttempt?.()
      } catch {
        // Analytics attribution is best-effort and must never block payment.
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: checkoutSuccessReturnUrl(window.location.origin, locale),
        },
        redirect: 'if_required',
      })

      if (stripeError) {
        // Payment failed before any charge succeeded — safe to retry.
        // Raw Stripe details stay in the logs; the customer sees mapped copy.
        onFailure(
          createPaymentFailure(mapStripeErrorMessage(stripeError, failureMessages), {
            source: 'stripe_confirm_payment',
            details: {
              cartId,
              code: stripeError.code,
              declineCode: stripeError.decline_code,
              type: stripeError.type,
              message: stripeError.message,
              paymentIntentId: stripeError.payment_intent?.id,
            },
          })
        )
        return
      }

      // Handle both succeeded (auto-capture) and requires_capture (manual capture) statuses
      if (
        paymentIntent?.status === 'succeeded' ||
        paymentIntent?.status === 'requires_capture'
      ) {
        console.log('[CHECKOUT] Payment authorized, completing cart:', {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          cartId,
        })

        const completion = await completeProviderConfirmedCheckout({
          complete: () => completeCart({ cartId, experiment, experimentVariant }),
          messages: failureMessages,
          failureContext: {
            source: 'stripe_complete_cart',
            details: {
              cartId,
              paymentIntentId: paymentIntent.id,
            },
          },
        })

        if (completion.ok) {
          onSuccess(completion.orderId)
        } else {
          onFailure(completion.failure)
        }
        return
      }

      // Unknown intent status (e.g. 'processing'): the charge state is
      // ambiguous — the intent may still succeed later. Surface the distinct
      // uncertain state so the UI never suggests retrying or switching
      // payment method, which could double-charge the customer.
      onFailure(
        createUncertainPaymentFailure(failureMessages, {
          source: 'stripe_unexpected_status',
          details: {
            cartId,
            status: paymentIntent?.status,
            paymentIntentId: paymentIntent?.id,
          },
        })
      )
    } catch (err) {
      // confirmPayment itself threw — no charge was made.
      onFailure(
        createPaymentFailure(failureMessages.genericPaymentFailed, {
          source: 'stripe_checkout_unexpected',
          details: { cartId, error: err instanceof Error ? err.message : err },
        })
      )
    } finally {
      setIsLoading(false)
      onProcessingChange?.(false)
    }
  }

  const formatAmount = (amt: number, curr: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr.toUpperCase(),
    }).format(amt)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* No wrapper box: the method row already frames this, and Stripe's
          Element is flattened (see stripe-provider appearance) so the fields
          read as part of the row rather than a box-within-a-box. */}
      <PaymentElement />

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading
          ? t('processing')
          : t('payAmount', { amount: formatAmount(amount, currency) })}
      </Button>
    </form>
  )
}
