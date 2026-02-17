'use client'

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'

interface PayPalButtonProps {
  cartId: string
  onSuccess: (orderId: string) => void
  onError: (error: string) => void
}

export function PayPalButton({
  cartId,
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
          // Set PayPal as the payment session
          const response = await fetch('/api/store/cart/payment-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartId,
              provider_id: 'paypal',
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to initialize PayPal payment')
          }

          const { cart } = await response.json()

          // The PayPal order ID should be in the payment session data
          const paypalOrderId = cart?.payment_session?.data?.id
          if (!paypalOrderId) {
            throw new Error('No PayPal order ID returned')
          }

          return paypalOrderId
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to create PayPal order')
          throw err
        }
      }}
      onApprove={async () => {
        try {
          // Complete the cart after PayPal approval
          const response = await fetch('/api/store/cart/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartId }),
          })

          if (!response.ok) {
            throw new Error('Failed to complete order')
          }

          const result = await response.json()
          if (result.order?.id) {
            onSuccess(result.order.id)
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
