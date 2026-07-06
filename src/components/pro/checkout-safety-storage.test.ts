import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  clearCheckoutSafetyStateForCart,
  clearCheckoutSafetyState,
  isProtectiveCheckoutFailureKind,
  recordCheckoutFailure,
  restoreCheckoutSafetyState,
} from './checkout-safety'
import type { CheckoutFailure } from './checkout-safety'

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

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('isProtectiveCheckoutFailureKind', () => {
  it('persists only the protective kinds', () => {
    expect(isProtectiveCheckoutFailureKind('order_pending')).toBe(true)
    expect(isProtectiveCheckoutFailureKind('payment_uncertain')).toBe(true)
    expect(isProtectiveCheckoutFailureKind('payment_failed')).toBe(false)
    expect(isProtectiveCheckoutFailureKind('payment_cancelled')).toBe(false)
  })
})

describe('recordCheckoutFailure / restoreCheckoutSafetyState', () => {
  it('round-trips an order_pending failure keyed by cart id', () => {
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)

    const restored = restoreCheckoutSafetyState()
    expect(restored).toEqual({
      cartId: 'cart_1',
      failure: ORDER_PENDING_FAILURE,
    })
  })

  it('round-trips a payment_uncertain failure', () => {
    recordCheckoutFailure('cart_1', UNCERTAIN_FAILURE)

    expect(restoreCheckoutSafetyState()?.failure).toEqual(UNCERTAIN_FAILURE)
  })

  it('ignores non-protective failure kinds', () => {
    recordCheckoutFailure('cart_1', {
      kind: 'payment_failed',
      message: 'Declined',
      reference: 'WCPOS-FAIL-0001',
    })
    recordCheckoutFailure('cart_1', {
      kind: 'payment_cancelled',
      message: 'Cancelled',
      reference: 'WCPOS-CANC-0001',
    })

    expect(restoreCheckoutSafetyState()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('ignores entries without a cart id', () => {
    recordCheckoutFailure('', ORDER_PENDING_FAILURE)

    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('prefers order_pending over a newer payment_uncertain entry', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    recordCheckoutFailure('cart_pending', ORDER_PENDING_FAILURE)
    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    recordCheckoutFailure('cart_uncertain', UNCERTAIN_FAILURE)

    const restored = restoreCheckoutSafetyState()
    expect(restored?.cartId).toBe('cart_pending')
    expect(restored?.failure.kind).toBe('order_pending')
  })

  it('prefers the most recent entry within the same kind', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    recordCheckoutFailure('cart_old', UNCERTAIN_FAILURE)
    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    recordCheckoutFailure('cart_new', {
      ...UNCERTAIN_FAILURE,
      reference: 'WCPOS-UNC-0002',
    })

    const restored = restoreCheckoutSafetyState()
    expect(restored?.cartId).toBe('cart_new')
    expect(restored?.failure.reference).toBe('WCPOS-UNC-0002')
  })

  it('overwrites an earlier entry for the same cart', () => {
    recordCheckoutFailure('cart_1', UNCERTAIN_FAILURE)
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)

    expect(sessionStorage.length).toBe(1)
    expect(restoreCheckoutSafetyState()?.failure.kind).toBe('order_pending')
  })

  it('ignores malformed JSON entries', () => {
    sessionStorage.setItem('wcpos:checkout-pending:cart_bad', 'not json {')

    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('ignores entries with a non-protective kind injected directly', () => {
    sessionStorage.setItem(
      'wcpos:checkout-pending:cart_bad',
      JSON.stringify({
        kind: 'payment_failed',
        message: 'Declined',
        reference: 'WCPOS-FAIL-0001',
        cartId: 'cart_bad',
        storedAt: 1,
      })
    )

    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('ignores entries missing required fields', () => {
    sessionStorage.setItem(
      'wcpos:checkout-pending:cart_bad',
      JSON.stringify({ kind: 'order_pending', cartId: 'cart_bad' })
    )

    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('ignores unrelated sessionStorage keys', () => {
    sessionStorage.setItem('some-other-key', 'value')

    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('swallows storage write failures (private mode / quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    expect(() => recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)).not.toThrow()
  })

  it('swallows storage read failures', () => {
    sessionStorage.setItem(
      'wcpos:checkout-pending:cart_1',
      JSON.stringify(ORDER_PENDING_FAILURE)
    )
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })

    expect(restoreCheckoutSafetyState()).toBeNull()
  })
})

describe('clearCheckoutSafetyState', () => {
  it('removes only the targeted persisted protective failure', () => {
    recordCheckoutFailure('cart_reset', ORDER_PENDING_FAILURE)
    recordCheckoutFailure('cart_keep', UNCERTAIN_FAILURE)

    clearCheckoutSafetyStateForCart('cart_reset')

    const restored = restoreCheckoutSafetyState()
    expect(restored?.cartId).toBe('cart_keep')
    expect(restored?.failure.kind).toBe('payment_uncertain')
    expect(sessionStorage.getItem('wcpos:checkout-pending:cart_reset')).toBeNull()
    expect(
      sessionStorage.getItem('wcpos:checkout-pending:cart_keep')
    ).not.toBeNull()
  })

  it('removes every persisted protective failure', () => {
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)
    recordCheckoutFailure('cart_2', UNCERTAIN_FAILURE)

    clearCheckoutSafetyState()

    expect(restoreCheckoutSafetyState()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('leaves unrelated keys untouched', () => {
    sessionStorage.setItem('unrelated', 'keep me')
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)

    clearCheckoutSafetyState()

    expect(sessionStorage.getItem('unrelated')).toBe('keep me')
  })

  it('swallows storage failures', () => {
    recordCheckoutFailure('cart_1', ORDER_PENDING_FAILURE)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })

    expect(() => clearCheckoutSafetyState()).not.toThrow()
  })
})
