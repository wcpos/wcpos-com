'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js'
import { completeCart } from '../complete-cart'
import {
  completeProviderConfirmedCheckout,
  createPaymentFailure,
  createUncertainPaymentFailure,
  mapStripeErrorMessage,
  type CheckoutFailure,
} from '../checkout-safety'
import { useCheckoutFailureMessages } from './use-checkout-failure-messages'
import { checkoutSuccessReturnUrl } from './return-url'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { isCheckoutConsentWithdrawalBlocked } from '@/lib/analytics/checkout-payment-lifecycle'
import type { BillingAddress } from './billing-step'
import {
  stripeBillingDetailsFromCheckout,
  stripeBillingDetailsWithWalletPrecedence,
} from '@/lib/stripe-billing-details'

/**
 * Apple Pay / Google Pay / Link wallets via Stripe's Express Checkout
 * Element. Renders nothing when the browser has no wallet available, so it
 * is safe to mount unconditionally above the payment method selector.
 *
 * Confirmation and completion follow the exact same safety path as the
 * card form: stripe.confirmPayment → completeProviderConfirmedCheckout,
 * with unexpected intent states reported as payment_uncertain.
 */
interface ExpressCheckoutRowProps {
  cartId: string
  experiment: string
  experimentVariant: ProCheckoutVariant
  billingAddress: BillingAddress
  customerEmail?: string | null
  onAttempt?: () => Promise<void> | void
  onSuccess: (orderId: string) => void
  onFailure: (failure: CheckoutFailure | null) => void
  /** Mirrors confirm-in-flight to the parent (locks billing Edit etc.). */
  onProcessingChange?: (processing: boolean) => void
}

export function ExpressCheckoutRow({
  cartId,
  experiment,
  experimentVariant,
  billingAddress,
  customerEmail,
  onAttempt,
  onSuccess,
  onFailure,
  onProcessingChange,
}: ExpressCheckoutRowProps) {
  const locale = useLocale()
  const t = useTranslations('pro.checkout.payment')
  const failureMessages = useCheckoutFailureMessages()
  const stripe = useStripe()
  const elements = useElements()
  const [hasWallets, setHasWallets] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  async function handleConfirm(
    event: StripeExpressCheckoutElementConfirmEvent
  ) {
    if (!stripe || !elements) return
    // Same double-submit guard the card form has — a second wallet
    // confirmation while one is in flight could double-charge.
    if (isConfirming) return
    setIsConfirming(true)
    onProcessingChange?.(true)
    onFailure(null)

    try {
      try {
        await onAttempt?.()
      } catch (error) {
        if (isCheckoutConsentWithdrawalBlocked(error)) throw error
        // Analytics attribution is best-effort and must never block payment.
      }

      const { error: stripeError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: checkoutSuccessReturnUrl(window.location.origin, locale),
            payment_method_data: {
              billing_details: stripeBillingDetailsWithWalletPrecedence(
                stripeBillingDetailsFromCheckout(
                  billingAddress,
                  customerEmail
                ),
                event.billingDetails
              ),
            },
          },
          redirect: 'if_required',
        })

      if (stripeError) {
        onFailure(
          createPaymentFailure(mapStripeErrorMessage(stripeError, failureMessages), {
            source: 'stripe_express_checkout',
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

      if (
        paymentIntent &&
        (paymentIntent.status === 'succeeded' ||
          paymentIntent.status === 'requires_capture')
      ) {
        const outcome = await completeProviderConfirmedCheckout({
          complete: () =>
            completeCart({ cartId, experiment, experimentVariant }),
          messages: failureMessages,
          failureContext: {
            source: 'stripe_express_checkout_complete',
            details: { cartId, paymentIntentId: paymentIntent.id },
          },
        })
        if (outcome.ok) {
          onSuccess(outcome.orderId)
        } else {
          onFailure(outcome.failure)
        }
        return
      }

      onFailure(
        createUncertainPaymentFailure(failureMessages, {
          source: 'stripe_express_checkout_status',
          details: { cartId, status: paymentIntent?.status },
        })
      )
    } catch (err) {
      onFailure(
        createPaymentFailure(failureMessages.genericPaymentFailed, {
          source: 'stripe_express_checkout',
          details: {
            cartId,
            error: err instanceof Error ? err.message : err,
          },
        })
      )
    } finally {
      setIsConfirming(false)
      onProcessingChange?.(false)
    }
  }

  return (
    <div className={hasWallets ? 'mb-4' : 'hidden'}>
      <ExpressCheckoutElement
        onReady={(event) => setHasWallets(Boolean(event.availablePaymentMethods))}
        onConfirm={handleConfirm}
      />
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        {t('walletSeparator')}
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
