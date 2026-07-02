'use client'

import { useState } from 'react'
import {
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { completeCart } from '../complete-cart'
import {
  completeProviderConfirmedCheckout,
  createPaymentFailure,
  createUncertainPaymentFailure,
  mapStripeErrorMessage,
  GENERIC_PAYMENT_FAILED_MESSAGE,
  type CheckoutFailure,
} from '../checkout-safety'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

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
  onSuccess: (orderId: string) => void
  onFailure: (failure: CheckoutFailure | null) => void
}

export function ExpressCheckoutRow({
  cartId,
  experiment,
  experimentVariant,
  onSuccess,
  onFailure,
}: ExpressCheckoutRowProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [hasWallets, setHasWallets] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  async function handleConfirm() {
    if (!stripe || !elements) return
    // Same double-submit guard the card form has — a second wallet
    // confirmation while one is in flight could double-charge.
    if (isConfirming) return
    setIsConfirming(true)
    onFailure(null)

    try {
      const { error: stripeError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/pro/checkout/success`,
          },
          redirect: 'if_required',
        })

      if (stripeError) {
        onFailure(
          createPaymentFailure(mapStripeErrorMessage(stripeError), {
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
        createUncertainPaymentFailure({
          source: 'stripe_express_checkout_status',
          details: { cartId, status: paymentIntent?.status },
        })
      )
    } catch (err) {
      onFailure(
        createPaymentFailure(GENERIC_PAYMENT_FAILED_MESSAGE, {
          source: 'stripe_express_checkout',
          details: {
            cartId,
            error: err instanceof Error ? err.message : err,
          },
        })
      )
    } finally {
      setIsConfirming(false)
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
        or choose how to pay
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
