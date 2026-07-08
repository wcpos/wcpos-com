import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  clearCheckoutSafetyState,
  completeProviderConfirmedCheckout,
  recordCheckoutFailure,
  restoreCheckoutSafetyState,
  shouldBlockCheckout,
  type CheckoutFailure,
  type CheckoutFailureMessages,
} from './checkout-safety'

const TEST_MESSAGES: CheckoutFailureMessages = {
  genericPaymentFailed: 'generic payment failed',
  genericCardFailed: 'generic card failed',
  unexpectedPaymentStatus: 'contact support before trying again',
  orderPending: 'do not pay again',
  stripeDeclines: {
    insufficientFunds: 'insufficient funds',
  },
  stripeCodes: {
    cardDeclined: 'card declined',
    expiredCard: 'expired card',
    incorrectCvc: 'incorrect cvc',
    invalidCvc: 'invalid cvc',
    incorrectNumber: 'incorrect number',
    invalidNumber: 'invalid number',
    invalidExpiryMonth: 'invalid expiry month',
    invalidExpiryYear: 'invalid expiry year',
    processingError: 'processing error',
    authenticationFailure: 'authentication failure',
    authenticationRequired: 'authentication required',
  },
}

const ORDER_PENDING_FAILURE: CheckoutFailure = {
  kind: 'order_pending',
  message: 'Your payment was received, but we could not finish creating your order.',
  reference: 'WCPOS-PEND-0001',
}

const UNCERTAIN_FAILURE: CheckoutFailure = {
  kind: 'payment_uncertain',
  message: "We couldn't confirm the status of your payment.",
  reference: 'WCPOS-UNC-0001',
}

describe('completeProviderConfirmedCheckout', () => {
  it('returns the order id when provider-confirmed completion succeeds', async () => {
    const complete = vi.fn().mockResolvedValue('order_1')

    const result = await completeProviderConfirmedCheckout({
      complete,
      messages: TEST_MESSAGES,
      failureContext: { source: 'stripe_complete_cart', details: { cartId: 'cart_1' } },
    })

    expect(result).toEqual({ ok: true, orderId: 'order_1' })
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('maps any provider-confirmed completion failure to order_pending', async () => {
    const complete = vi.fn().mockRejectedValue(new TypeError('network down'))

    const result = await completeProviderConfirmedCheckout({
      complete,
      messages: TEST_MESSAGES,
      failureContext: { source: 'paypal_complete_cart', details: { cartId: 'cart_1' } },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.kind).toBe('order_pending')
      expect(result.failure.message.toLowerCase()).toContain('do not pay again')
      expect(result.failure.reference).toMatch(/^WCPOS-/)
    }
  })
})

describe('Checkout safety state', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('records and restores protective failures', () => {
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)

    expect(restoreCheckoutSafetyState()).toEqual({
      cartId: 'cart_1',
      failure: ORDER_PENDING_FAILURE,
    })
  })

  it('does not record retryable payment failures', () => {
    recordCheckoutFailure('cart_1', {
      kind: 'payment_failed',
      message: 'Declined',
      reference: 'WCPOS-FAIL-0001',
    })

    expect(restoreCheckoutSafetyState()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('orders restored failures by safety severity before recency', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    recordCheckoutFailure('cart_pending', ORDER_PENDING_FAILURE)
    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    recordCheckoutFailure('cart_uncertain', UNCERTAIN_FAILURE)

    const restored = restoreCheckoutSafetyState()

    expect(restored?.cartId).toBe('cart_pending')
    expect(restored?.failure.kind).toBe('order_pending')
  })

  it('blocks Checkout only for order_pending failures', () => {
    expect(shouldBlockCheckout(ORDER_PENDING_FAILURE)).toBe(true)
    expect(shouldBlockCheckout(UNCERTAIN_FAILURE)).toBe(false)
  })

  it('clears every persisted protective failure', () => {
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)
    recordCheckoutFailure('cart_2', UNCERTAIN_FAILURE)

    clearCheckoutSafetyState()

    expect(restoreCheckoutSafetyState()).toBeNull()
  })
})
