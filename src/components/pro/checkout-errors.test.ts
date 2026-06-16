import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clientLogger } from '@/lib/client-logger'

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn() },
}))

import {
  createCancelledFailure,
  createOrderPendingFailure,
  createPaymentFailure,
  createUncertainPaymentFailure,
  generateErrorReference,
  mapStripeErrorMessage,
  GENERIC_CARD_FAILED_MESSAGE,
  GENERIC_PAYMENT_FAILED_MESSAGE,
  ORDER_PENDING_MESSAGE,
  UNEXPECTED_PAYMENT_STATUS_MESSAGE,
  OrderPendingError,
} from './checkout-errors'

beforeEach(() => {
  // Restore first so each test gets a fresh spy with zeroed call counts.
  vi.restoreAllMocks()
  vi.mocked(clientLogger.error).mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('generateErrorReference', () => {
  it('produces a WCPOS-prefixed reference', () => {
    expect(generateErrorReference()).toMatch(/^WCPOS-[A-Z0-9]+-[A-Z0-9]{4}$/)
  })

  it('produces distinct references across calls', () => {
    const references = new Set(
      Array.from({ length: 20 }, () => generateErrorReference())
    )
    expect(references.size).toBeGreaterThan(1)
  })
})

describe('mapStripeErrorMessage', () => {
  it('maps card_declined to a human message', () => {
    expect(mapStripeErrorMessage({ type: 'card_error', code: 'card_declined' })).toBe(
      'Your card was declined. Please try a different card or payment method.'
    )
  })

  it('prefers the decline code for insufficient funds', () => {
    expect(
      mapStripeErrorMessage({
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      })
    ).toContain('insufficient funds')
  })

  it('maps expired_card to a human message', () => {
    expect(mapStripeErrorMessage({ code: 'expired_card' })).toContain('expired')
  })

  it('maps incorrect_cvc to a human message', () => {
    expect(mapStripeErrorMessage({ code: 'incorrect_cvc' })).toContain('security code')
  })

  it('maps processing_error to a not-charged retry message', () => {
    expect(mapStripeErrorMessage({ code: 'processing_error' })).toContain(
      'You have not been charged'
    )
  })

  it('maps bank authentication failures to a human message', () => {
    expect(
      mapStripeErrorMessage({ code: 'payment_intent_authentication_failure' })
    ).toContain('your bank')
  })

  it('falls back to a generic card message for unknown card errors', () => {
    expect(
      mapStripeErrorMessage({ type: 'card_error', code: 'some_future_code' })
    ).toBe(GENERIC_CARD_FAILED_MESSAGE)
  })

  it('falls back to a generic message for unknown error types', () => {
    expect(mapStripeErrorMessage({ type: 'api_error' })).toBe(
      GENERIC_PAYMENT_FAILED_MESSAGE
    )
  })

  it('never echoes the raw Stripe message to the customer', () => {
    const raw = 'Raw internal Stripe diagnostics string'
    const mapped = mapStripeErrorMessage({
      type: 'api_error',
      code: 'unmapped_code',
      message: raw,
    })
    expect(mapped).not.toContain(raw)
    expect(mapped).toBe(GENERIC_PAYMENT_FAILED_MESSAGE)
  })
})

describe('createPaymentFailure', () => {
  it('returns a payment_failed failure with the given message and a reference', () => {
    const failure = createPaymentFailure('Friendly message', {
      source: 'test_source',
    })

    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).toBe('Friendly message')
    expect(failure.reference).toMatch(/^WCPOS-/)
  })

  it('logs the raw details together with the reference', () => {
    const failure = createPaymentFailure('Friendly message', {
      source: 'test_source',
      details: { raw: 'provider junk' },
    })

    expect(console.error).toHaveBeenCalledWith(
      '[CHECKOUT] Payment failure:',
      expect.objectContaining({
        reference: failure.reference,
        source: 'test_source',
        details: { raw: 'provider junk' },
      })
    )
  })
})

describe('createUncertainPaymentFailure', () => {
  it('always uses the contact-support-before-retrying copy', () => {
    const failure = createUncertainPaymentFailure({
      source: 'stripe_unexpected_status',
    })

    expect(failure.kind).toBe('payment_uncertain')
    expect(failure.message).toBe(UNEXPECTED_PAYMENT_STATUS_MESSAGE)
    expect(failure.message).toContain('contact support before trying again')
    expect(failure.reference).toMatch(/^WCPOS-/)
  })

  it('logs the failure as an error for support correlation', () => {
    const failure = createUncertainPaymentFailure({
      source: 'stripe_unexpected_status',
      details: { paymentIntentId: 'pi_1', status: 'processing' },
    })

    expect(console.error).toHaveBeenCalledWith(
      '[CHECKOUT] Payment failure:',
      expect.objectContaining({
        reference: failure.reference,
        kind: 'payment_uncertain',
        details: { paymentIntentId: 'pi_1', status: 'processing' },
      })
    )
  })
})

describe('createOrderPendingFailure', () => {
  it('always uses the do-not-pay-again copy', () => {
    const failure = createOrderPendingFailure({ source: 'stripe_complete_cart' })

    expect(failure.kind).toBe('order_pending')
    expect(failure.message).toBe(ORDER_PENDING_MESSAGE)
    expect(failure.message.toLowerCase()).toContain('do not pay again')
    expect(failure.reference).toMatch(/^WCPOS-/)
  })

  it('logs the failure as an error for support correlation', () => {
    const failure = createOrderPendingFailure({
      source: 'paypal_complete_cart',
      details: { cartId: 'cart_1' },
    })

    expect(console.error).toHaveBeenCalledWith(
      '[CHECKOUT] Payment failure:',
      expect.objectContaining({
        reference: failure.reference,
        kind: 'order_pending',
      })
    )
  })
})

describe('createCancelledFailure', () => {
  it('returns a payment_cancelled failure without logging an error', () => {
    const failure = createCancelledFailure('Cancelled copy', {
      source: 'paypal_cancel',
    })

    expect(failure.kind).toBe('payment_cancelled')
    expect(failure.message).toBe('Cancelled copy')
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('server-side failure shipping (clientLogger)', () => {
  it('ships payment_failed failures with their reference at error level', () => {
    const failure = createPaymentFailure('Friendly message', {
      source: 'stripe_confirm_payment',
      details: { raw: 'provider junk' },
    })

    expect(clientLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Checkout payment failure'),
      expect.objectContaining({
        reference: failure.reference,
        kind: 'payment_failed',
        source: 'stripe_confirm_payment',
        details: { raw: 'provider junk' },
      })
    )
  })

  it('ships order_pending failures so support can correlate the reference', () => {
    const failure = createOrderPendingFailure({
      source: 'paypal_complete_cart',
      details: { cartId: 'cart_1' },
    })

    expect(clientLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reference: failure.reference,
        kind: 'order_pending',
        source: 'paypal_complete_cart',
      })
    )
  })

  it('ships payment_uncertain failures', () => {
    const failure = createUncertainPaymentFailure({
      source: 'stripe_unexpected_status',
    })

    expect(clientLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reference: failure.reference,
        kind: 'payment_uncertain',
      })
    )
  })

  it('does not ship customer cancellations', () => {
    createCancelledFailure('Cancelled copy', { source: 'paypal_cancel' })

    expect(clientLogger.error).not.toHaveBeenCalled()
  })

  it('still returns the failure when shipping throws', () => {
    vi.mocked(clientLogger.error).mockImplementationOnce(() => {
      throw new Error('logger not configured')
    })

    const failure = createPaymentFailure('Friendly message', {
      source: 'stripe_confirm_payment',
    })

    expect(failure.kind).toBe('payment_failed')
    expect(failure.reference).toMatch(/^WCPOS-/)
    // The devtools fallback still fired.
    expect(console.error).toHaveBeenCalled()
  })
})

describe('buildFailure → server beacon', () => {
  let beacon: ReturnType<typeof vi.fn>
  beforeEach(() => {
    beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('beacons report-failure for money-at-risk kinds', () => {
    createOrderPendingFailure({ source: 'stripe_complete_cart', details: { cartId: 'c1' } })
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe('/api/checkout/report-failure')
    const payload = JSON.parse(beacon.mock.calls[0][1] as string)
    expect(payload.kind).toBe('order_pending')
    expect(payload.reference).toMatch(/^WCPOS-/)
  })

  it('does NOT beacon ordinary retryable payment failures', () => {
    createPaymentFailure('declined', { source: 'stripe_confirm_payment' })
    expect(beacon).not.toHaveBeenCalled()
  })

  it('falls back to a keepalive fetch when sendBeacon returns false', () => {
    beacon.mockReturnValue(false)
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchMock)

    createOrderPendingFailure({ source: 'stripe_complete_cart', details: { cartId: 'c1' } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/checkout/report-failure')
    expect(init.keepalive).toBe(true)
    const payload = JSON.parse(init.body as string)
    expect(payload.kind).toBe('order_pending')
    expect(payload.reference).toMatch(/^WCPOS-/)
  })
})

describe('OrderPendingError', () => {
  it('is an Error with a stable name', () => {
    const err = new OrderPendingError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('OrderPendingError')
    expect(err.message).toBe('boom')
  })

  it('has a default message', () => {
    expect(new OrderPendingError().message).toContain('did not produce an order')
  })
})
