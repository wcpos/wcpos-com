import { afterEach, describe, expect, it } from 'vitest'

import {
  CHECKOUT_FAILURE_KINDS,
  ORDER_PENDING_CODE,
  compareCheckoutFailureKindSafety,
  isCheckoutFailureKind,
  isMoneyAtRiskCheckoutFailureKind,
  isProtectiveCheckoutFailureKind,
  isRoutineCheckoutFailureKind,
  ownerSeverityForCheckoutFailure,
  shouldBlockCheckoutForFailureKind,
} from './checkout-failure-taxonomy'

const originalObjectHasOwn = Object.hasOwn

afterEach(() => {
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true,
    writable: true,
    value: originalObjectHasOwn,
  })
})

describe('checkout failure taxonomy', () => {
  it('defines the complete set of checkout failure kinds', () => {
    expect(CHECKOUT_FAILURE_KINDS).toEqual([
      'payment_failed',
      'payment_cancelled',
      'payment_uncertain',
      'order_pending',
    ])
    expect(isCheckoutFailureKind('order_pending')).toBe(true)
    expect(isCheckoutFailureKind('banana')).toBe(false)
  })

  it('keeps owner alert severity routing in one pure classification', () => {
    expect(ownerSeverityForCheckoutFailure('order_pending')).toBe('fatal')
    expect(ownerSeverityForCheckoutFailure('payment_uncertain')).toBe('fatal')
    expect(ownerSeverityForCheckoutFailure('payment_failed')).toBe('error')
    expect(ownerSeverityForCheckoutFailure('payment_cancelled')).toBeNull()
    expect(ownerSeverityForCheckoutFailure('banana')).toBeNull()
  })

  it('does not depend on Object.hasOwn in browser-executed safety paths', () => {
    Object.defineProperty(Object, 'hasOwn', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    expect(isCheckoutFailureKind('order_pending')).toBe(true)
    expect(ownerSeverityForCheckoutFailure('payment_uncertain')).toBe('fatal')
    expect(isCheckoutFailureKind('banana')).toBe(false)
  })

  it('names the owner-alert severity classes for callers that need boolean checks', () => {
    expect(isMoneyAtRiskCheckoutFailureKind('order_pending')).toBe(true)
    expect(isMoneyAtRiskCheckoutFailureKind('payment_uncertain')).toBe(true)
    expect(isMoneyAtRiskCheckoutFailureKind('payment_failed')).toBe(false)
    expect(isRoutineCheckoutFailureKind('payment_failed')).toBe(true)
    expect(isRoutineCheckoutFailureKind('payment_cancelled')).toBe(false)
  })

  it('identifies browser-protective kinds without treating all reported failures as protective', () => {
    expect(isProtectiveCheckoutFailureKind('order_pending')).toBe(true)
    expect(isProtectiveCheckoutFailureKind('payment_uncertain')).toBe(true)
    expect(isProtectiveCheckoutFailureKind('payment_failed')).toBe(false)
    expect(isProtectiveCheckoutFailureKind('payment_cancelled')).toBe(false)
  })

  it('blocks checkout only for the captured-payment-without-order state', () => {
    expect(shouldBlockCheckoutForFailureKind('order_pending')).toBe(true)
    expect(shouldBlockCheckoutForFailureKind('payment_uncertain')).toBe(false)
    expect(shouldBlockCheckoutForFailureKind('payment_failed')).toBe(false)
  })

  it('orders protective restore safety before recency can choose between entries', () => {
    expect(compareCheckoutFailureKindSafety('order_pending', 'payment_uncertain')).toBeLessThan(0)
    expect(compareCheckoutFailureKindSafety('payment_uncertain', 'order_pending')).toBeGreaterThan(0)
    expect(compareCheckoutFailureKindSafety('payment_uncertain', 'payment_uncertain')).toBe(0)
  })

  it('keeps the order_pending wire code tied to the taxonomy kind', () => {
    expect(ORDER_PENDING_CODE).toBe('order_pending')
  })
})
