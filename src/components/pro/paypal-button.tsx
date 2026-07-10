'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  INSTANCE_LOADING_STATE,
  usePayPal,
  usePayPalOneTimePaymentSession,
} from '@paypal/react-paypal-js/sdk-v6'
import {
  capturePayPalOrder,
  completeCart,
  createPaymentSession,
} from './complete-cart'
import {
  createCancelledFailure,
  completeProviderConfirmedCheckout,
  createPaymentFailure,
  type CheckoutFailure,
} from './checkout-safety'
import { useCheckoutFailureMessages } from './checkout/use-checkout-failure-messages'
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
  onAttempt?: () => Promise<void> | void
  onSuccess: (orderId: string) => void
  /**
   * Reports payment failures to the parent (null clears a previous failure
   * when the customer retries). Failure messages are already customer-safe.
   */
  onFailure: (failure: CheckoutFailure | null) => void
  onProcessingChange?: (processing: boolean) => void
}

export function PayPalButton({
  cartId,
  experiment,
  experimentVariant,
  paypalOrderId,
  onAttempt,
  onSuccess,
  onFailure,
  onProcessingChange,
}: PayPalButtonProps) {
  const t = useTranslations('pro.checkout.payment.paypalButton')
  const tErrors = useTranslations('pro.checkout.errors')
  const failureMessages = useCheckoutFailureMessages()
  // When createOrder rejects, the PayPal SDK re-reports the same failure via
  // onError. The createOrder catch already reported it (with its own support
  // reference), so onError must skip that echo — otherwise the customer sees
  // a second message under a different reference for one failure.
  const createOrderFailureReported = useRef(false)
  const attemptInFlight = useRef(false)
  const [isAttempting, setIsAttempting] = useState(false)
  const [keepRetryAfterCreateOrderFailure, setKeepRetryAfterCreateOrderFailure] =
    useState(false)
  const releaseAttemptGuard = () => {
    attemptInFlight.current = false
    setIsAttempting(false)
  }
  const {
    isHydrated,
    loadingStatus: sdkLoadingStatus,
    error: sdkError,
  } = usePayPal()
  const { error, isPending, handleClick } =
    usePayPalOneTimePaymentSession({
      createOrder: async () => {
        createOrderFailureReported.current = false
        try {
          onFailure(null)

          // The PayPal SDK itself must start synchronously from the customer's
          // click so popup-capable browsers retain transient user activation.
          // Its deferred createOrder callback is the safe point to await the
          // consent/attribution refresh before any order is created.
          try {
            await onAttempt?.()
          } catch {
            // Analytics attribution is best-effort and must never block payment.
          }

          if (paypalOrderId) {
            return { orderId: paypalOrderId }
          }

          // Set PayPal as the payment session
          const { cart } = await createPaymentSession<{ cart?: PayPalSessionCart }>({
            cartId,
            providerId: 'pp_paypal_paypal',
            errorMessage: 'PAYPAL_INIT_FAILED',
          })

          const pendingPayPalSession = cart?.payment_collection?.payment_sessions?.find(
            (session) => session.provider_id === 'pp_paypal_paypal'
          )

          const fallbackPayPalOrderId =
            pendingPayPalSession?.data?.id || cart?.payment_session?.data?.id

          if (!fallbackPayPalOrderId) {
            throw new Error('PAYPAL_ORDER_ID_MISSING')
          }

          return { orderId: fallbackPayPalOrderId }
        } catch (err) {
          // No payment has happened yet — safe to retry.
          releaseAttemptGuard()
          createOrderFailureReported.current = true
          setKeepRetryAfterCreateOrderFailure(true)
          onFailure(
            createPaymentFailure(tErrors('paypalInitFailed'), {
              source: 'paypal_create_order',
              details: { cartId, error: err instanceof Error ? err.message : err },
            })
          )
          throw err
        }
      },
      onApprove: async (data) => {
        const orderId = data?.orderId ?? paypalOrderId
        if (!orderId) {
          releaseAttemptGuard()
          onFailure(
            createPaymentFailure(tErrors('paypalFailed'), {
              source: 'paypal_capture',
              details: { cartId, error: 'PAYPAL_APPROVAL_ORDER_ID_MISSING' },
            })
          )
          return
        }

        onProcessingChange?.(true)
        try {
          try {
            await capturePayPalOrder({ cartId, orderId })
          } catch (err) {
            onFailure(
              createPaymentFailure(tErrors('paypalFailed'), {
                source: 'paypal_capture',
                details: {
                  cartId,
                  orderId,
                  error: err instanceof Error ? err.message : String(err),
                },
              })
            )
            return
          }

          const completion = await completeProviderConfirmedCheckout({
            complete: () => completeCart({ cartId, experiment, experimentVariant }),
            messages: failureMessages,
            failureContext: {
              source: 'paypal_complete_cart',
              details: { cartId, orderId },
            },
          })

          if (completion.ok) {
            onSuccess(completion.orderId)
          } else {
            onFailure(completion.failure)
          }
        } finally {
          releaseAttemptGuard()
          onProcessingChange?.(false)
        }
      },
      onError: (err) => {
        releaseAttemptGuard()
        // Skip the SDK's echo of a createOrder failure that was already
        // reported (single failure, single reference). The flag is consumed
        // here and also reset at the start of every createOrder attempt, so
        // genuinely new SDK errors are never swallowed.
        if (createOrderFailureReported.current) {
          createOrderFailureReported.current = false
          return
        }
        setKeepRetryAfterCreateOrderFailure(false)
        onFailure(
          createPaymentFailure(tErrors('paypalFailed'), {
            source: 'paypal_sdk',
            details: {
              cartId,
              error: err instanceof Error ? err.message : String(err),
            },
          })
        )
      },
      onCancel: () => {
        releaseAttemptGuard()
        onFailure(
          createCancelledFailure(tErrors('paypalCancelled'), {
            source: 'paypal_cancel',
            details: { cartId },
          })
        )
      },
    })

  if (
    !isHydrated ||
    isPending ||
    sdkLoadingStatus === INSTANCE_LOADING_STATE.PENDING
  ) {
    return (
      <div className="space-y-2 rounded-md border border-dashed p-4">
        <div className="h-10 animate-pulse rounded bg-muted" />
        <p className="text-center text-sm text-muted-foreground">
          {t('loading')}
        </p>
      </div>
    )
  }

  if (
    sdkError ||
    sdkLoadingStatus === INSTANCE_LOADING_STATE.REJECTED ||
    (error && !keepRetryAfterCreateOrderFailure)
  ) {
    return (
      <div className="text-center text-sm text-destructive py-4">
        {t('loadFailed')}
      </div>
    )
  }

  const handleAttempt = () => {
    if (attemptInFlight.current) return
    attemptInFlight.current = true
    setIsAttempting(true)

    try {
      void handleClick().catch(() => {
        releaseAttemptGuard()
      })
    } catch {
      releaseAttemptGuard()
    }
  }

  return (
    <paypal-button
      type="checkout"
      disabled={isAttempting}
      onClick={handleAttempt}
    />
  )
}
