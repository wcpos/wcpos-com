'use client'

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { completeCart, createPaymentSession } from './complete-cart'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'

interface PayPalSessionCart {
  payment_collection?: {
    payment_sessions?: Array<{
      provider_id?: string
      data?: { id?: string }
    }>
  }
  payment_session?: { data?: { id?: string } }
}

interface PayPalButtonProps {
  cartId: string
  experiment: string
  experimentVariant: ProCheckoutVariant
  paypalOrderId?: string | null
  onSuccess: (orderId: string) => void
  onError: (error: string) => void
}

export function PayPalButton({
  cartId,
  experiment,
  experimentVariant,
  paypalOrderId,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()

  if (isPending) {
    return (
      <div className="space-y-2 rounded-md border border-dashed p-4">
        <div className="h-10 animate-pulse rounded bg-muted" />
        <p className="text-center text-sm text-muted-foreground">
          Loading PayPal secure checkout...
        </p>
      </div>
    )
  }

  if (isRejected) {
    return (
      <div className="text-center text-sm text-destructive py-4">
        Failed to load PayPal. Please try another payment method.
      </div>
    )
  }

  return (
    <PayPalButtons
      style={{
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
      }}
      createOrder={async () => {
        try {
          if (paypalOrderId) {
            return paypalOrderId
          }

          // Set PayPal as the payment session
          const { cart } = await createPaymentSession<{ cart?: PayPalSessionCart }>({
            cartId,
            providerId: 'pp_paypal_paypal',
            errorMessage: 'Failed to initialize PayPal payment',
          })

          const pendingPayPalSession = cart?.payment_collection?.payment_sessions?.find(
            (session) => session.provider_id === 'pp_paypal_paypal'
          )

          const fallbackPayPalOrderId =
            pendingPayPalSession?.data?.id || cart?.payment_session?.data?.id

          if (!fallbackPayPalOrderId) {
            throw new Error('No PayPal order ID returned')
          }

          return fallbackPayPalOrderId
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to create PayPal order')
          throw err
        }
      }}
      onApprove={async () => {
        try {
          // Complete the cart after PayPal approval
          const orderId = await completeCart({ cartId, experiment, experimentVariant })
          if (orderId) {
            onSuccess(orderId)
          }
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to complete order')
        }
      }}
      onError={(err) => {
        console.error('PayPal error:', err)
        onError('PayPal payment failed. Please try again.')
      }}
      onCancel={() => {
        // User cancelled - no action needed
      }}
    />
  )
}
