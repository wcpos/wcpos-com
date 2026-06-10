'use client'

import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { completeCart } from './complete-cart'
import {
  createOrderPendingFailure,
  createPaymentFailure,
  createUncertainPaymentFailure,
  mapStripeErrorMessage,
  GENERIC_PAYMENT_FAILED_MESSAGE,
  type CheckoutFailure,
} from './checkout-errors'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

interface CheckoutFormProps {
  cartId: string
  amount: number
  currency: string
  experiment: string
  experimentVariant: ProCheckoutVariant
  onSuccess: (orderId: string) => void
  /**
   * Reports payment failures to the parent (null clears a previous failure
   * when the customer retries). Failure messages are already customer-safe.
   */
  onFailure: (failure: CheckoutFailure | null) => void
}

export function CheckoutForm({
  cartId,
  amount,
  currency,
  experiment,
  experimentVariant,
  onSuccess,
  onFailure,
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    onFailure(null)

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pro/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (stripeError) {
        // Payment failed before any charge succeeded — safe to retry.
        // Raw Stripe details stay in the logs; the customer sees mapped copy.
        onFailure(
          createPaymentFailure(mapStripeErrorMessage(stripeError), {
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

        try {
          // Complete the cart to create the order
          const orderId = await completeCart({ cartId, experiment, experimentVariant })
          onSuccess(orderId)
        } catch (err) {
          // Payment is already authorized/captured at this point. Any
          // completion failure means money was taken without an order —
          // surface the distinct "do not pay again" state, never a retry.
          onFailure(
            createOrderPendingFailure({
              source: 'stripe_complete_cart',
              details: {
                cartId,
                paymentIntentId: paymentIntent.id,
                error: err instanceof Error ? err.message : err,
              },
            })
          )
        }
        return
      }

      // Unknown intent status (e.g. 'processing'): the charge state is
      // ambiguous — the intent may still succeed later. Surface the distinct
      // uncertain state so the UI never suggests retrying or switching
      // payment method, which could double-charge the customer.
      onFailure(
        createUncertainPaymentFailure({
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
        createPaymentFailure(GENERIC_PAYMENT_FAILED_MESSAGE, {
          source: 'stripe_checkout_unexpected',
          details: { cartId, error: err instanceof Error ? err.message : err },
        })
      )
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (amt: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr.toUpperCase(),
    }).format(amt)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-md p-4">
        <PaymentElement />
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
      </Button>
    </form>
  )
}
