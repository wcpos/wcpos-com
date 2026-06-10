import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  clearPendingFailures,
  isPersistedPendingKind,
  persistPendingFailure,
  readPendingFailure,
} from './checkout-pending-storage'
import type { CheckoutFailure } from './checkout-errors'

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

describe('isPersistedPendingKind', () => {
  it('persists only the protective kinds', () => {
    expect(isPersistedPendingKind('order_pending')).toBe(true)
    expect(isPersistedPendingKind('payment_uncertain')).toBe(true)
    expect(isPersistedPendingKind('payment_failed')).toBe(false)
    expect(isPersistedPendingKind('payment_cancelled')).toBe(false)
  })
})

describe('persistPendingFailure / readPendingFailure', () => {
  it('round-trips an order_pending failure keyed by cart id', () => {
    persistPendingFailure('cart_1', ORDER_PENDING_FAILURE)

    const restored = readPendingFailure()
    expect(restored).toEqual({
      cartId: 'cart_1',
      failure: ORDER_PENDING_FAILURE,
    })
  })

  it('round-trips a payment_uncertain failure', () => {
    persistPendingFailure('cart_1', UNCERTAIN_FAILURE)

    expect(readPendingFailure()?.failure).toEqual(UNCERTAIN_FAILURE)
  })

  it('ignores non-protective failure kinds', () => {
    persistPendingFailure('cart_1', {
      kind: 'payment_failed',
      message: 'Declined',
      reference: 'WCPOS-FAIL-0001',
    })
    persistPendingFailure('cart_1', {
      kind: 'payment_cancelled',
      message: 'Cancelled',
      reference: 'WCPOS-CANC-0001',
    })

    expect(readPendingFailure()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('ignores entries without a cart id', () => {
    persistPendingFailure('', ORDER_PENDING_FAILURE)

    expect(readPendingFailure()).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(readPendingFailure()).toBeNull()
  })

  it('prefers order_pending over a newer payment_uncertain entry', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    persistPendingFailure('cart_pending', ORDER_PENDING_FAILURE)
    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    persistPendingFailure('cart_uncertain', UNCERTAIN_FAILURE)

    const restored = readPendingFailure()
    expect(restored?.cartId).toBe('cart_pending')
    expect(restored?.failure.kind).toBe('order_pending')
  })

  it('prefers the most recent entry within the same kind', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    persistPendingFailure('cart_old', UNCERTAIN_FAILURE)
    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    persistPendingFailure('cart_new', {
      ...UNCERTAIN_FAILURE,
      reference: 'WCPOS-UNC-0002',
    })

    const restored = readPendingFailure()
    expect(restored?.cartId).toBe('cart_new')
    expect(restored?.failure.reference).toBe('WCPOS-UNC-0002')
  })

  it('overwrites an earlier entry for the same cart', () => {
    persistPendingFailure('cart_1', UNCERTAIN_FAILURE)
    persistPendingFailure('cart_1', ORDER_PENDING_FAILURE)

    expect(sessionStorage.length).toBe(1)
    expect(readPendingFailure()?.failure.kind).toBe('order_pending')
  })

  it('ignores malformed JSON entries', () => {
    sessionStorage.setItem('wcpos:checkout-pending:cart_bad', 'not json {')

    expect(readPendingFailure()).toBeNull()
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

    expect(readPendingFailure()).toBeNull()
  })

  it('ignores entries missing required fields', () => {
    sessionStorage.setItem(
      'wcpos:checkout-pending:cart_bad',
      JSON.stringify({ kind: 'order_pending', cartId: 'cart_bad' })
    )

    expect(readPendingFailure()).toBeNull()
  })

  it('ignores unrelated sessionStorage keys', () => {
    sessionStorage.setItem('some-other-key', 'value')

    expect(readPendingFailure()).toBeNull()
  })

  it('swallows storage write failures (private mode / quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    expect(() => persistPendingFailure('cart_1', ORDER_PENDING_FAILURE)).not.toThrow()
  })

  it('swallows storage read failures', () => {
    sessionStorage.setItem(
      'wcpos:checkout-pending:cart_1',
      JSON.stringify(ORDER_PENDING_FAILURE)
    )
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })

    expect(readPendingFailure()).toBeNull()
  })
})

describe('clearPendingFailures', () => {
  it('removes every persisted protective failure', () => {
    persistPendingFailure('cart_1', ORDER_PENDING_FAILURE)
    persistPendingFailure('cart_2', UNCERTAIN_FAILURE)

    clearPendingFailures()

    expect(readPendingFailure()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('leaves unrelated keys untouched', () => {
    sessionStorage.setItem('unrelated', 'keep me')
    persistPendingFailure('cart_1', ORDER_PENDING_FAILURE)

    clearPendingFailures()

    expect(sessionStorage.getItem('unrelated')).toBe('keep me')
  })

  it('swallows storage failures', () => {
    persistPendingFailure('cart_1', ORDER_PENDING_FAILURE)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })

    expect(() => clearPendingFailures()).not.toThrow()
  })
})
