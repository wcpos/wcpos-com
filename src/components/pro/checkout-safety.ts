/**
 * Browser-side Checkout safety lifecycle.
 *
 * Provider adapters (Stripe / PayPal / BTCPay / method switching) report facts
 * into this module. This module owns the common safety policy: customer-safe
 * failure construction, support references, owner reporting, protective
 * persistence, and the invariant that provider-confirmed completion failures are
 * always Order pending — never retryable payment failures.
 */

import { clientLogger } from '@/lib/client-logger'
import {
  compareCheckoutFailureKindSafety,
  isOwnerReportedCheckoutFailureKind,
  isProtectiveCheckoutFailureKind as isProtectiveKind,
  shouldBlockCheckoutForFailureKind,
  type CheckoutFailureKind,
  type ProtectiveCheckoutFailureKind,
} from '@/lib/checkout-failure-taxonomy'

export type { CheckoutFailureKind } from '@/lib/checkout-failure-taxonomy'
export { isProtectiveCheckoutFailureKind } from '@/lib/checkout-failure-taxonomy'

export interface CheckoutFailure {
  kind: CheckoutFailureKind
  /** Customer-safe message. Never a raw provider/API string. */
  message: string
  /** Short reference id, also written to logs, for support correlation. */
  reference: string
}

export interface FailureLogContext {
  /** Where the failure happened, e.g. 'stripe_confirm_payment'. */
  source: string
  /** Raw error details — logged, never shown to the customer. */
  details?: unknown
}

/**
 * Thrown by completeCart when the Order could not be created after the payment
 * step. Callers must treat this as Order pending and never as retryable.
 */
export class OrderPendingError extends Error {
  constructor(message = 'ORDER_PENDING') {
    super(message)
    this.name = 'OrderPendingError'
  }
}

// ---------------------------------------------------------------------------
// Customer-safe copy
// ---------------------------------------------------------------------------

export interface CheckoutFailureMessages {
  genericPaymentFailed: string
  genericCardFailed: string
  unexpectedPaymentStatus: string
  orderPending: string
  stripeDeclines: {
    insufficientFunds: string
  }
  stripeCodes: {
    cardDeclined: string
    expiredCard: string
    incorrectCvc: string
    invalidCvc: string
    incorrectNumber: string
    invalidNumber: string
    invalidExpiryMonth: string
    invalidExpiryYear: string
    processingError: string
    authenticationFailure: string
    authenticationRequired: string
  }
}

// ---------------------------------------------------------------------------
// Stripe error mapping
// ---------------------------------------------------------------------------

/** Structural subset of Stripe's StripeError — keeps this module SDK-free. */
export interface StripeErrorLike {
  type?: string
  code?: string
  decline_code?: string
  message?: string
}

function stripeDeclineMessages(messages: CheckoutFailureMessages): Record<string, string> {
  return {
    insufficient_funds: messages.stripeDeclines.insufficientFunds,
  }
}

function stripeCodeMessages(messages: CheckoutFailureMessages): Record<string, string> {
  return {
    card_declined: messages.stripeCodes.cardDeclined,
    expired_card: messages.stripeCodes.expiredCard,
    incorrect_cvc: messages.stripeCodes.incorrectCvc,
    invalid_cvc: messages.stripeCodes.invalidCvc,
    incorrect_number: messages.stripeCodes.incorrectNumber,
    invalid_number: messages.stripeCodes.invalidNumber,
    invalid_expiry_month: messages.stripeCodes.invalidExpiryMonth,
    invalid_expiry_year: messages.stripeCodes.invalidExpiryYear,
    processing_error: messages.stripeCodes.processingError,
    payment_intent_authentication_failure:
      messages.stripeCodes.authenticationFailure,
    authentication_required: messages.stripeCodes.authenticationRequired,
  }
}

/**
 * Map a Stripe confirm error to customer-safe copy. Known decline/error codes
 * get specific guidance; anything unknown gets a generic message. The raw
 * Stripe `message` is never returned — it stays in the logs.
 */
export function mapStripeErrorMessage(
  error: StripeErrorLike,
  messages: CheckoutFailureMessages
): string {
  const declineMessages = stripeDeclineMessages(messages)
  if (error.decline_code && declineMessages[error.decline_code]) {
    return declineMessages[error.decline_code]
  }
  const codeMessages = stripeCodeMessages(messages)
  if (error.code && codeMessages[error.code]) {
    return codeMessages[error.code]
  }
  if (error.type === 'card_error' || error.type === 'validation_error') {
    return messages.genericCardFailed
  }
  return messages.genericPaymentFailed
}

// ---------------------------------------------------------------------------
// Failure construction and owner reporting
// ---------------------------------------------------------------------------

/**
 * Owner reporting is classified by the pure Checkout failure taxonomy. The
 * server routes money-at-risk kinds to fatal (Discord + email) and routine
 * declines to error (Discord only). `payment_cancelled` is the Customer's own
 * choice and is intentionally absent.
 */
export function generateErrorReference(): string {
  const time = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')
  return `WCPOS-${time}-${random}`
}

function reportFailureToOwner(failure: CheckoutFailure): void {
  if (!isOwnerReportedCheckoutFailureKind(failure.kind)) return

  const endpoint = '/api/checkout/report-failure'
  let queued = false
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      queued = navigator.sendBeacon(
        endpoint,
        JSON.stringify({ kind: failure.kind, reference: failure.reference })
      )
    }
  } catch {
    queued = false
  }

  // sendBeacon returns false when its queue is full (or it's unavailable). For a
  // money-at-risk alert we must not drop it silently — fall back to a keepalive
  // fetch with the minimal payload the server actually logs.
  if (!queued && typeof fetch !== 'undefined') {
    void fetch(endpoint, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: failure.kind, reference: failure.reference }),
    }).catch(() => {
      // Both transports failed — clientLogger.error below is the fallback.
    })
  }
}

function buildFailure(
  kind: CheckoutFailureKind,
  message: string,
  context: FailureLogContext
): CheckoutFailure {
  const failure: CheckoutFailure = {
    kind,
    message,
    reference: generateErrorReference(),
  }

  if (kind === 'payment_cancelled') {
    console.log('[CHECKOUT] Payment cancelled:', {
      reference: failure.reference,
      source: context.source,
    })
    return failure
  }

  console.error('[CHECKOUT] Payment failure:', {
    reference: failure.reference,
    kind,
    source: context.source,
    details: context.details,
  })

  // Ship the failure server-side (Loki via clientLogger) so support can look up
  // the WCPOS-… reference a customer quotes. The console.error above is only
  // visible in the Customer's own devtools.
  try {
    clientLogger.error('Checkout payment failure {reference}', {
      reference: failure.reference,
      kind,
      source: context.source,
      details: context.details,
    })
  } catch {
    // Logging must never break failure reporting — console output above is the fallback.
  }

  reportFailureToOwner(failure)
  return failure
}

/** A payment that failed or was declined — safe to retry. */
export function createPaymentFailure(
  message: string,
  context: FailureLogContext
): CheckoutFailure {
  return buildFailure('payment_failed', message, context)
}

/**
 * The charge state could not be confirmed. Always uses fixed support-before-pay
 * copy so the UI never invites a retry or method switch that could double-charge.
 */
export function createUncertainPaymentFailure(
  messages: CheckoutFailureMessages,
  context: FailureLogContext
): CheckoutFailure {
  return buildFailure('payment_uncertain', messages.unexpectedPaymentStatus, context)
}

/** The Customer cancelled the payment themselves. */
export function createCancelledFailure(
  message: string,
  context: FailureLogContext
): CheckoutFailure {
  return buildFailure('payment_cancelled', message, context)
}

/** Payment went through but Order creation failed — the worst Customer state. */
export function createOrderPendingFailure(
  messages: CheckoutFailureMessages,
  context: FailureLogContext
): CheckoutFailure {
  return buildFailure('order_pending', messages.orderPending, context)
}

export type ProviderConfirmedCompletionOutcome =
  | { ok: true; orderId: string }
  | { ok: false; failure: CheckoutFailure }

export interface ProviderConfirmedCompletionParams {
  /** Calls the existing completion adapter after the provider confirmed payment. */
  complete: () => Promise<string>
  messages: CheckoutFailureMessages
  failureContext: FailureLogContext
}

/**
 * Run post-provider-confirmation completion behind the Checkout safety interface.
 * If completion fails for any reason, money may have moved without an Order, so
 * the only safe output is `order_pending`.
 */
export async function completeProviderConfirmedCheckout({
  complete,
  messages,
  failureContext,
}: ProviderConfirmedCompletionParams): Promise<ProviderConfirmedCompletionOutcome> {
  try {
    const orderId = await complete()
    return { ok: true, orderId }
  } catch (err) {
    return {
      ok: false,
      failure: createOrderPendingFailure(messages, {
        source: failureContext.source,
        details: {
          ...(typeof failureContext.details === 'object' &&
          failureContext.details !== null
            ? failureContext.details
            : { details: failureContext.details }),
          error: err instanceof Error ? err.message : err,
        },
      }),
    }
  }
}

// ---------------------------------------------------------------------------
// Protective failure persistence and restore policy
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'wcpos:checkout-pending:'
export const PROTECTIVE_FAILURE_TTL_MS = 15 * 60 * 1000

interface PersistedCheckoutSafetyState {
  kind: ProtectiveCheckoutFailureKind
  message: string
  reference: string
  cartId: string
  storedAt: number
}

export interface RestoredCheckoutSafetyState {
  cartId: string
  failure: CheckoutFailure
}

export function shouldBlockCheckout(failure: CheckoutFailure): boolean {
  return shouldBlockCheckoutForFailureKind(failure.kind)
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    // Accessing sessionStorage itself can throw (e.g. storage disabled).
    return null
  }
}

function parsePersistedEntry(raw: string | null): PersistedCheckoutSafetyState | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const entry = parsed as Record<string, unknown>
    if (
      isProtectiveKind(entry.kind) &&
      typeof entry.message === 'string' &&
      entry.message.length > 0 &&
      typeof entry.reference === 'string' &&
      entry.reference.length > 0 &&
      typeof entry.cartId === 'string' &&
      entry.cartId.length > 0
    ) {
      return {
        kind: entry.kind,
        message: entry.message,
        reference: entry.reference,
        cartId: entry.cartId,
        storedAt: typeof entry.storedAt === 'number' ? entry.storedAt : 0,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persist exactly the Checkout failure states that protect against a second
 * payment. Non-protective failures are ignored.
 */
export function recordCheckoutFailure(cartId: string, failure: CheckoutFailure): void {
  if (!cartId || !isProtectiveKind(failure.kind)) return
  const storage = getSessionStorage()
  if (!storage) return

  const entry: PersistedCheckoutSafetyState = {
    kind: failure.kind,
    message: failure.message,
    reference: failure.reference,
    cartId,
    storedAt: Date.now(),
  }

  try {
    storage.setItem(STORAGE_KEY_PREFIX + cartId, JSON.stringify(entry))
  } catch {
    // Quota exceeded / private mode — fall back to in-memory-only behaviour.
  }
}

/**
 * Restore the most safety-critical persisted Checkout failure. A reload creates a
 * new cart, so scan every entry; Order pending outranks payment uncertain.
 */
export function restoreCheckoutSafetyState(): RestoredCheckoutSafetyState | null {
  const storage = getSessionStorage()
  if (!storage) return null

  const entries: PersistedCheckoutSafetyState[] = []
  const expiredKeys: string[] = []
  const now = Date.now()
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue
      const entry = parsePersistedEntry(storage.getItem(key))
      if (!entry) continue
      if (now - entry.storedAt > PROTECTIVE_FAILURE_TTL_MS) {
        expiredKeys.push(key)
        continue
      }
      entries.push(entry)
    }
  } catch {
    return null
  }

  for (const key of expiredKeys) {
    try {
      storage.removeItem(key)
    } catch {
      // Best effort — worst case a stale key lingers until the next cleanup.
    }
  }

  if (entries.length === 0) return null

  entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return compareCheckoutFailureKindSafety(a.kind, b.kind)
    }
    return b.storedAt - a.storedAt
  })

  const top = entries[0]
  return {
    cartId: top.cartId,
    failure: { kind: top.kind, message: top.message, reference: top.reference },
  }
}

/**
 * Remove one cart's persisted protective failure after support has confirmed
 * that specific warning is safe to dismiss.
 */
export function clearCheckoutSafetyStateForCart(cartId: string): void {
  if (!cartId) return
  const storage = getSessionStorage()
  if (!storage) return

  try {
    storage.removeItem(STORAGE_KEY_PREFIX + cartId)
  } catch {
    // Best effort — worst case the conservative notice shows again.
  }
}

/**
 * Remove every persisted protective failure once an Order definitively exists.
 */
export function clearCheckoutSafetyState(): void {
  const storage = getSessionStorage()
  if (!storage) return

  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) keys.push(key)
    }
    for (const key of keys) {
      storage.removeItem(key)
    }
  } catch {
    // Best effort — worst case the conservative notice shows again.
  }
}
