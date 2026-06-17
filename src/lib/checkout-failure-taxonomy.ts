/**
 * Pure Checkout failure taxonomy shared by browser lifecycle code and server
 * alert routing.
 *
 * This module owns cross-runtime semantics only: the stable failure vocabulary,
 * owner-alert severity, browser-protective classification, Checkout blocking,
 * and the `order_pending` machine code. Provider mapping, customer copy,
 * logging, beacons, and persistence stay in the browser Checkout safety module.
 */

export const CHECKOUT_FAILURE_KINDS = [
  'payment_failed',
  'payment_cancelled',
  'payment_uncertain',
  'order_pending',
] as const

export type CheckoutFailureKind = (typeof CHECKOUT_FAILURE_KINDS)[number]
export type CheckoutFailureOwnerSeverity = 'fatal' | 'error'
export type ProtectiveCheckoutFailureKind = 'order_pending' | 'payment_uncertain'

export const ORDER_PENDING_CODE = 'order_pending' satisfies CheckoutFailureKind

interface CheckoutFailureTaxonomyEntry {
  ownerSeverity: CheckoutFailureOwnerSeverity | null
  protective: boolean
  blocksCheckout: boolean
  safetyRank: number
}

const CHECKOUT_FAILURE_TAXONOMY = {
  payment_failed: {
    ownerSeverity: 'error',
    protective: false,
    blocksCheckout: false,
    safetyRank: 0,
  },
  payment_cancelled: {
    ownerSeverity: null,
    protective: false,
    blocksCheckout: false,
    safetyRank: 0,
  },
  payment_uncertain: {
    ownerSeverity: 'fatal',
    protective: true,
    blocksCheckout: false,
    safetyRank: 1,
  },
  order_pending: {
    ownerSeverity: 'fatal',
    protective: true,
    blocksCheckout: true,
    safetyRank: 2,
  },
} satisfies Record<CheckoutFailureKind, CheckoutFailureTaxonomyEntry>

export function isCheckoutFailureKind(value: unknown): value is CheckoutFailureKind {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(CHECKOUT_FAILURE_TAXONOMY, value)
  )
}

export function ownerSeverityForCheckoutFailure(
  kind: unknown
): CheckoutFailureOwnerSeverity | null {
  if (!isCheckoutFailureKind(kind)) return null
  return CHECKOUT_FAILURE_TAXONOMY[kind].ownerSeverity
}

export function isOwnerReportedCheckoutFailureKind(
  kind: unknown
): kind is CheckoutFailureKind {
  return ownerSeverityForCheckoutFailure(kind) !== null
}

export function isMoneyAtRiskCheckoutFailureKind(
  kind: unknown
): kind is ProtectiveCheckoutFailureKind {
  return ownerSeverityForCheckoutFailure(kind) === 'fatal'
}

export function isRoutineCheckoutFailureKind(kind: unknown): kind is 'payment_failed' {
  return ownerSeverityForCheckoutFailure(kind) === 'error'
}

export function isProtectiveCheckoutFailureKind(
  kind: unknown
): kind is ProtectiveCheckoutFailureKind {
  if (!isCheckoutFailureKind(kind)) return false
  return CHECKOUT_FAILURE_TAXONOMY[kind].protective
}

export function shouldBlockCheckoutForFailureKind(kind: CheckoutFailureKind): boolean {
  return CHECKOUT_FAILURE_TAXONOMY[kind].blocksCheckout
}

/**
 * Sorts most safety-critical first for restored protective failures.
 * `order_pending` outranks `payment_uncertain`; equal ranks preserve caller
 * tie-breakers such as recency.
 */
export function compareCheckoutFailureKindSafety(
  a: CheckoutFailureKind,
  b: CheckoutFailureKind
): number {
  return CHECKOUT_FAILURE_TAXONOMY[b].safetyRank - CHECKOUT_FAILURE_TAXONOMY[a].safetyRank
}
