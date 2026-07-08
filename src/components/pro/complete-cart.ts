import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { OrderPendingError } from './checkout-safety'

export interface CompleteCartParams {
  cartId: string
  experiment: string
  experimentVariant: ProCheckoutVariant
}

/**
 * Complete a Medusa cart to create an order.
 *
 * Shared by all client payment flows (Stripe, PayPal) so completion
 * behaviour — including experiment attribution fields — stays consistent.
 *
 * Only called AFTER the payment has been confirmed/approved by the provider,
 * so every failure here means money may have been taken without an order.
 * Callers must surface OrderPendingError as the distinct "payment received,
 * order pending — do not pay again" state, never as a retryable error.
 *
 * @returns the created order id
 * @throws OrderPendingError if the request fails or returns no order id
 */
export async function completeCart({
  cartId,
  experiment,
  experimentVariant,
}: CompleteCartParams): Promise<string> {
  const response = await fetch('/api/store/cart/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartId,
      experiment,
      experimentVariant,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[CHECKOUT] Cart completion failed:', {
      cartId,
      status: response.status,
      statusText: response.statusText,
      error: errorData,
    })
    throw new OrderPendingError()
  }

  const result = await response.json()
  const orderId: string | undefined = result.order?.id

  if (!orderId) {
    // The completion call "succeeded" but produced no order — previously this
    // was logged as success and silently ignored, leaving the customer stuck
    // after their payment was captured.
    console.error('[CHECKOUT] Cart completion returned no order id:', {
      cartId,
      result,
    })
    throw new OrderPendingError()
  }

  console.log('[CHECKOUT] Order created successfully:', { orderId })
  return orderId
}

export interface CapturePayPalOrderParams {
  cartId: string
  orderId: string
}

/**
 * Capture an approved PayPal order before cart completion.
 *
 * PayPal SDK v6 approval does not capture by itself; Medusa will reject cart
 * completion until the provider reports the PayPal order captured. This call is
 * still pre-completion, so failures are retryable PayPal failures rather than
 * the distinct order-pending/money-at-risk state.
 */
export async function capturePayPalOrder({
  cartId,
  orderId,
}: CapturePayPalOrderParams): Promise<void> {
  const response = await fetch('/api/store/cart/paypal/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, orderId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[CHECKOUT] PayPal capture failed:', {
      cartId,
      orderId,
      status: response.status,
      error: errorData,
    })
    throw new Error('PAYPAL_CAPTURE_FAILED')
  }
}

export interface CreatePaymentSessionParams {
  cartId: string
  providerId: string
  paymentCollectionId?: string | null
  /**
   * Stable error code for the thrown Error on failure. Customer-facing copy
   * belongs at the call site so it can come from translations.
   */
  errorMessage?: string
}

/**
 * Create (or switch to) a payment session for a cart.
 *
 * Shared by checkout initialization, payment-method switching and the
 * PayPal order creation flow.
 *
 * @returns the parsed JSON response
 * @throws Error(errorMessage) if the request fails
 */
export async function createPaymentSession<TResult = unknown>({
  cartId,
  providerId,
  paymentCollectionId,
  errorMessage = 'PAYMENT_SESSION_FAILED',
}: CreatePaymentSessionParams): Promise<TResult> {
  const response = await fetch('/api/store/cart/payment-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartId,
      provider_id: providerId,
      ...(paymentCollectionId ? { paymentCollectionId } : {}),
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[CHECKOUT] Payment session request failed:', {
      providerId,
      status: response.status,
      error: errorData,
    })
    throw new Error(errorMessage)
  }

  return response.json()
}
