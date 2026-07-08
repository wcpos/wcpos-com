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
  OrderPendingError,
  type CheckoutFailureMessages,
} from './checkout-safety'


const TEST_MESSAGES: CheckoutFailureMessages = {
  genericPaymentFailed: 'generic payment failed translated message',
  genericCardFailed: 'generic card failed translated message',
  unexpectedPaymentStatus:
    'translated message: contact support before trying again',
  orderPending: 'translated message: do not pay again',
  stripeDeclines: {
    insufficientFunds: 'insufficient funds translated message',
  },
  stripeCodes: {
    cardDeclined: 'card declined translated message',
    expiredCard: 'expired translated message',
    incorrectCvc: 'security code translated message',
    invalidCvc: 'invalid security code translated message',
    incorrectNumber: 'incorrect number translated message',
    invalidNumber: 'invalid number translated message',
    invalidExpiryMonth: 'invalid expiry month translated message',
    invalidExpiryYear: 'invalid expiry year translated message',
    processingError: 'You have not been charged translated message',
    authenticationFailure: 'your bank translated message',
    authenticationRequired: 'your bank translated message',
  },
}

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
    expect(
      mapStripeErrorMessage(
        { type: 'card_error', code: 'card_declined' },
        TEST_MESSAGES
      )
    ).toBe(TEST_MESSAGES.stripeCodes.cardDeclined)
  })

  it('prefers the decline code for insufficient funds', () => {
    expect(
      mapStripeErrorMessage({
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
      }, TEST_MESSAGES)
    ).toContain('insufficient funds')
  })

  it('maps expired_card to a human message', () => {
    expect(mapStripeErrorMessage({ code: 'expired_card' }, TEST_MESSAGES)).toContain('expired')
  })

  it('maps incorrect_cvc to a human message', () => {
    expect(mapStripeErrorMessage({ code: 'incorrect_cvc' }, TEST_MESSAGES)).toContain('security code')
  })

  it('maps processing_error to a not-charged retry message', () => {
    expect(mapStripeErrorMessage({ code: 'processing_error' }, TEST_MESSAGES)).toContain(
      'You have not been charged'
    )
  })

  it('maps bank authentication failures to a human message', () => {
    expect(
      mapStripeErrorMessage({ code: 'payment_intent_authentication_failure' }, TEST_MESSAGES)
    ).toContain('your bank')
  })

  it('falls back to a generic card message for unknown card errors', () => {
    expect(
      mapStripeErrorMessage({ type: 'card_error', code: 'some_future_code' }, TEST_MESSAGES)
    ).toBe(TEST_MESSAGES.genericCardFailed)
  })

  it('falls back to a generic message for unknown error types', () => {
    expect(mapStripeErrorMessage({ type: 'api_error' }, TEST_MESSAGES)).toBe(
      TEST_MESSAGES.genericPaymentFailed
    )
  })

  it('never echoes the raw Stripe message to the customer', () => {
    const raw = 'Raw internal Stripe diagnostics string'
    const mapped = mapStripeErrorMessage({
      type: 'api_error',
      code: 'unmapped_code',
      message: raw,
    }, TEST_MESSAGES)
    expect(mapped).not.toContain(raw)
    expect(mapped).toBe(TEST_MESSAGES.genericPaymentFailed)
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
    const failure = createUncertainPaymentFailure(TEST_MESSAGES, {
      source: 'stripe_unexpected_status',
    })

    expect(failure.kind).toBe('payment_uncertain')
    expect(failure.message).toBe(TEST_MESSAGES.unexpectedPaymentStatus)
    expect(failure.message).toContain('contact support before trying again')
    expect(failure.reference).toMatch(/^WCPOS-/)
  })

  it('logs the failure as an error for support correlation', () => {
    const failure = createUncertainPaymentFailure(TEST_MESSAGES, {
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
    const failure = createOrderPendingFailure(TEST_MESSAGES, { source: 'stripe_complete_cart' })

    expect(failure.kind).toBe('order_pending')
    expect(failure.message).toBe(TEST_MESSAGES.orderPending)
    expect(failure.message.toLowerCase()).toContain('do not pay again')
    expect(failure.reference).toMatch(/^WCPOS-/)
  })

  it('logs the failure as an error for support correlation', () => {
    const failure = createOrderPendingFailure(TEST_MESSAGES, {
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
    const failure = createOrderPendingFailure(TEST_MESSAGES, {
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
    const failure = createUncertainPaymentFailure(TEST_MESSAGES, {
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
  
const TEST_MESSAGES: CheckoutFailureMessages = {
  genericPaymentFailed: 'TEST_MESSAGES.genericPaymentFailed',
  genericCardFailed: 'TEST_MESSAGES.genericCardFailed',
  unexpectedPaymentStatus: 'TEST_MESSAGES.unexpectedPaymentStatus',
  orderPending: 'TEST_MESSAGES.orderPending',
  stripeDeclines: {
    insufficientFunds: 'insufficient funds translated message',
  },
  stripeCodes: {
    cardDeclined: 'card declined translated message',
    expiredCard: 'expired translated message',
    incorrectCvc: 'security code translated message',
    invalidCvc: 'invalid security code translated message',
    incorrectNumber: 'incorrect number translated message',
    invalidNumber: 'invalid number translated message',
    invalidExpiryMonth: 'invalid expiry month translated message',
    invalidExpiryYear: 'invalid expiry year translated message',
    processingError: 'You have not been charged translated message',
    authenticationFailure: 'your bank translated message',
    authenticationRequired: 'your bank translated message',
  },
}

beforeEach(() => {
    beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('beacons report-failure for money-at-risk kinds', () => {
    createOrderPendingFailure(TEST_MESSAGES, { source: 'stripe_complete_cart', details: { cartId: 'c1' } })
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe('/api/checkout/report-failure')
    const payload = JSON.parse(beacon.mock.calls[0][1] as string)
    expect(payload.kind).toBe('order_pending')
    expect(payload.reference).toMatch(/^WCPOS-/)
  })

  it('beacons routine payment failures with the minimal server payload', () => {
    createPaymentFailure('declined', {
      source: 'stripe_confirm_payment',
      details: { raw: 'x'.repeat(3_000) },
    })
    expect(beacon).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(beacon.mock.calls[0][1] as string)
    expect(payload).toEqual({
      kind: 'payment_failed',
      reference: expect.stringMatching(/^WCPOS-/),
    })
  })

  it('does NOT beacon customer cancellations', () => {
    createCancelledFailure('Cancelled copy', { source: 'paypal_cancel' })
    expect(beacon).not.toHaveBeenCalled()
  })

  it('falls back to a keepalive fetch when sendBeacon returns false', () => {
    beacon.mockReturnValue(false)
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchMock)

    createOrderPendingFailure(TEST_MESSAGES, { source: 'stripe_complete_cart', details: { cartId: 'c1' } })

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
    expect(new OrderPendingError().message).toBe('ORDER_PENDING')
  })
})
