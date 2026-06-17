'use client'

import { useRef } from 'react'
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { completeCart, createPaymentSession } from './complete-cart'
import {
  createCancelledFailure,
  completeProviderConfirmedCheckout,
  createPaymentFailure,
  PAYPAL_CANCELLED_MESSAGE,
  PAYPAL_FAILED_MESSAGE,
  PAYPAL_INIT_FAILED_MESSAGE,
  type CheckoutFailure,
} from './checkout-safety'
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
  /**
   * Reports payment failures to the parent (null clears a previous failure
   * when the customer retries). Failure messages are already customer-safe.
   */
  onFailure: (failure: CheckoutFailure | null) => void
}

export function PayPalButton({
  cartId,
  experiment,
  experimentVariant,
  paypalOrderId,
  onSuccess,
  onFailure,
}: PayPalButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer()

  // When createOrder rejects, the PayPal SDK re-reports the same failure via
  // onError. The createOrder catch already reported it (with its own support
  // reference), so onError must skip that echo — otherwise the customer sees
  // a second message under a different reference for one failure.
  const createOrderFailureReported = useRef(false)

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
        createOrderFailureReported.current = false
        try {
          onFailure(null)

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
          // No payment has happened yet — safe to retry.
          createOrderFailureReported.current = true
          onFailure(
            createPaymentFailure(PAYPAL_INIT_FAILED_MESSAGE, {
              source: 'paypal_create_order',
              details: { cartId, error: err instanceof Error ? err.message : err },
            })
          )
          throw err
        }
      }}
      onApprove={async () => {
        const completion = await completeProviderConfirmedCheckout({
          complete: () => completeCart({ cartId, experiment, experimentVariant }),
          failureContext: {
            source: 'paypal_complete_cart',
            details: { cartId },
          },
        })

        if (completion.ok) {
          onSuccess(completion.orderId)
        } else {
          onFailure(completion.failure)
        }
      }}
      onError={(err) => {
        // Skip the SDK's echo of a createOrder failure that was already
        // reported (single failure, single reference). The flag is consumed
        // here and also reset at the start of every createOrder attempt, so
        // genuinely new SDK errors are never swallowed.
        if (createOrderFailureReported.current) {
          createOrderFailureReported.current = false
          return
        }
        onFailure(
          createPaymentFailure(PAYPAL_FAILED_MESSAGE, {
            source: 'paypal_sdk',
            details: { cartId, error: err instanceof Error ? err.message : String(err) },
          })
        )
      }}
      onCancel={() => {
        onFailure(
          createCancelledFailure(PAYPAL_CANCELLED_MESSAGE, {
            source: 'paypal_cancel',
            details: { cartId },
          })
        )
      }}
    />
  )
}
