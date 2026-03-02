'use client'

import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

interface CheckoutFormProps {
  cartId: string
  amount: number
  currency: string
  experiment: string
  experimentVariant: ProCheckoutVariant
  onSuccess: (orderId: string) => void
}

export function CheckoutForm({
  cartId,
  amount,
  currency,
  experiment,
  experimentVariant,
  onSuccess,
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setError(null)

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
        console.error('[CHECKOUT] Stripe payment confirmation failed:', {
          code: stripeError.code,
          message: stripeError.message,
          type: stripeError.type,
          paymentIntent: stripeError.payment_intent,
        })
        setError(stripeError.message || 'Payment failed')
        setIsLoading(false)
        return
      }

      // Handle both succeeded (auto-capture) and requires_capture (manual capture) statuses
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        console.log('[CHECKOUT] Payment authorized, completing cart:', {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          cartId,
        })

        // Complete the cart to create the order
        const completeResponse = await fetch('/api/store/cart/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartId,
            experiment,
            experimentVariant,
          }),
        })

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json().catch(() => ({}))
          console.error('[CHECKOUT] Cart completion failed:', {
            status: completeResponse.status,
            statusText: completeResponse.statusText,
            error: errorData,
          })
          throw new Error('Failed to complete order')
        }

        const result = await completeResponse.json()
        console.log('[CHECKOUT] Order created successfully:', { orderId: result.order?.id })
        if (result.order?.id) {
          onSuccess(result.order.id)
        }
      } else {
        console.warn('[CHECKOUT] Unexpected payment intent status:', {
          status: paymentIntent?.status,
          paymentIntentId: paymentIntent?.id,
        })
      }
    } catch (err) {
      console.error('[CHECKOUT] Payment processing error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
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

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

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
