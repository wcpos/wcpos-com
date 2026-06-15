/**
 * Checkout payment-failure classification and customer-safe messaging.
 *
 * Raw provider errors (Stripe / PayPal / BTCPay / Medusa) are logged with a
 * generated reference id; customers only ever see mapped, human-readable copy
 * plus the reference they can quote to support.
 */

import { clientLogger } from '@/lib/client-logger'

export type CheckoutFailureKind =
  /** Payment was declined or never made — safe for the customer to retry. */
  | 'payment_failed'
  /** Customer cancelled the payment themselves — informational, retry is fine. */
  | 'payment_cancelled'
  /**
   * The charge state is ambiguous (e.g. a Stripe intent stuck in
   * 'processing'): money may still be taken later. The customer must check
   * with support before retrying — never show retry/switch-method guidance,
   * or they could be double-charged via a second payment session.
   */
  | 'payment_uncertain'
  /**
   * Payment was authorized/captured but the order could not be created.
   * The customer must NOT pay again — support has to finish or refund it.
   */
  | 'order_pending'

export interface CheckoutFailure {
  kind: CheckoutFailureKind
  /** Customer-safe message. Never a raw provider/API string. */
  message: string
  /** Short reference id, also written to logs, for support correlation. */
  reference: string
}

/**
 * Thrown by completeCart when the order could not be created after the
 * payment step. Callers must treat this as "money may have been taken,
 * no order exists" and never present it as a retryable payment error.
 */
export class OrderPendingError extends Error {
  constructor(message = 'Cart completion did not produce an order') {
    super(message)
    this.name = 'OrderPendingError'
  }
}

export function generateErrorReference(): string {
  const time = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')
  return `WCPOS-${time}-${random}`
}

// ---------------------------------------------------------------------------
// Customer-safe copy
// ---------------------------------------------------------------------------

export const GENERIC_PAYMENT_FAILED_MESSAGE =
  'We were unable to process your payment. Please try again or use a different payment method.'

export const GENERIC_CARD_FAILED_MESSAGE =
  'Your card could not be charged. Please check your card details, or try a different card or payment method.'

export const UNEXPECTED_PAYMENT_STATUS_MESSAGE =
  "We couldn't confirm the status of your payment. If you think you may have been charged, please contact support before trying again."

export const ORDER_PENDING_MESSAGE =
  "Your payment was received, but we couldn't finish creating your order. Please do not pay again — contact support and we will finish your order or refund the payment."

export const PAYPAL_FAILED_MESSAGE =
  "PayPal couldn't complete your payment. You have not been charged — please try again or use a different payment method."

export const PAYPAL_INIT_FAILED_MESSAGE =
  "We couldn't start the PayPal checkout. Please try again or use a different payment method."

export const PAYPAL_CANCELLED_MESSAGE =
  "PayPal checkout was cancelled and you have not been charged. You can try again whenever you're ready."

export const BTCPAY_INIT_FAILED_MESSAGE =
  "We couldn't start the Bitcoin payment. You have not been charged — please try again or use a different payment method."

export const METHOD_SWITCH_FAILED_MESSAGE =
  "We couldn't prepare that payment method. Please try again or choose a different one."

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

const STRIPE_DECLINE_MESSAGES: Record<string, string> = {
  insufficient_funds:
    'Your card was declined due to insufficient funds. Please use a different card or payment method.',
}

const STRIPE_CODE_MESSAGES: Record<string, string> = {
  card_declined: 'Your card was declined. Please try a different card or payment method.',
  expired_card: 'Your card has expired. Please use a different card.',
  incorrect_cvc: "Your card's security code is incorrect. Please check it and try again.",
  invalid_cvc: "Your card's security code is invalid. Please check it and try again.",
  incorrect_number: 'Your card number appears to be invalid. Please check it and try again.',
  invalid_number: 'Your card number appears to be invalid. Please check it and try again.',
  invalid_expiry_month: "Your card's expiry date is invalid. Please check it and try again.",
  invalid_expiry_year: "Your card's expiry date is invalid. Please check it and try again.",
  processing_error:
    'Something went wrong while processing your card. You have not been charged — please try again.',
  payment_intent_authentication_failure:
    "We couldn't verify your card with your bank. Please try again or use a different payment method.",
  authentication_required:
    "We couldn't verify your card with your bank. Please try again or use a different payment method.",
}

/**
 * Map a Stripe confirm error to customer-safe copy. Known decline/error codes
 * get specific guidance; anything unknown gets a generic message. The raw
 * Stripe `message` is never returned — it stays in the logs.
 */
export function mapStripeErrorMessage(error: StripeErrorLike): string {
  if (error.decline_code && STRIPE_DECLINE_MESSAGES[error.decline_code]) {
    return STRIPE_DECLINE_MESSAGES[error.decline_code]
  }
  if (error.code && STRIPE_CODE_MESSAGES[error.code]) {
    return STRIPE_CODE_MESSAGES[error.code]
  }
  if (error.type === 'card_error' || error.type === 'validation_error') {
    return GENERIC_CARD_FAILED_MESSAGE
  }
  return GENERIC_PAYMENT_FAILED_MESSAGE
}

// ---------------------------------------------------------------------------
// Failure constructors (generate a reference + keep details in logs)
// ---------------------------------------------------------------------------

export interface FailureLogContext {
  /** Where the failure happened, e.g. 'stripe_confirm_payment'. */
  source: string
  /** Raw error details — logged, never shown to the customer. */
  details?: unknown
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
  } else {
    console.error('[CHECKOUT] Payment failure:', {
      reference: failure.reference,
      kind,
      source: context.source,
      details: context.details,
    })

    // Ship the failure server-side (Loki via clientLogger) so support can look
    // up the WCPOS-… reference a customer quotes. The console.error above is
    // only visible in the customer's own devtools.
    try {
      clientLogger.error('Checkout payment failure {reference}', {
        reference: failure.reference,
        kind,
        source: context.source,
        details: context.details,
      })
    } catch {
      // Logging must never break failure reporting — console output above is
      // the fallback.
    }

    // Money-at-risk failures (charged but no order, or ambiguous charge) must
    // reach the SERVER logger so Discord/Sentry alert — clientLogger only goes
    // to Loki. sendBeacon survives the customer navigating away.
    if (kind === 'order_pending' || kind === 'payment_uncertain') {
      try {
        if (typeof navigator !== 'undefined') {
          navigator.sendBeacon?.(
            '/api/checkout/report-failure',
            JSON.stringify({
              kind,
              reference: failure.reference,
              source: context.source,
              details: context.details,
            })
          )
        }
      } catch {
        // Beacon unavailable — clientLogger.error above is the fallback.
      }
    }
  }

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
 * The charge state could not be confirmed (e.g. Stripe 'processing') — the
 * payment may still complete later. Always uses the fixed "contact support
 * before trying again" copy so the UI never invites a retry or a method
 * switch that could double-charge the customer.
 */
export function createUncertainPaymentFailure(context: FailureLogContext): CheckoutFailure {
  return buildFailure('payment_uncertain', UNEXPECTED_PAYMENT_STATUS_MESSAGE, context)
}

/** The customer cancelled the payment themselves. */
export function createCancelledFailure(
  message: string,
  context: FailureLogContext
): CheckoutFailure {
  return buildFailure('payment_cancelled', message, context)
}

/**
 * Payment went through but order creation failed — the worst customer state.
 * Always uses the fixed "do not pay again" copy.
 */
export function createOrderPendingFailure(context: FailureLogContext): CheckoutFailure {
  return buildFailure('order_pending', ORDER_PENDING_MESSAGE, context)
}
