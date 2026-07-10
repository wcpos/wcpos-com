'use client'

import { trackClientEvent } from './client-events'
import { getPostHogSessionId } from './posthog-browser'
import {
  buildCheckoutPaymentEventProperties,
  type CheckoutPaymentProvider,
} from './checkout-payment-events'

const CHECKOUT_ATTRIBUTION_REFRESH_TIMEOUT_MS = 1000

export interface CheckoutPaymentLifecycleContext {
  cartId: string
  paymentProvider: CheckoutPaymentProvider
  plan?: unknown
  experiment?: unknown
  variant?: unknown
  locale?: unknown
  [key: string]: unknown
}

async function refreshCheckoutAttribution(cartId: string): Promise<void> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<void>((resolve) => {
    timeout = setTimeout(() => {
      controller.abort()
      resolve()
    }, CHECKOUT_ATTRIBUTION_REFRESH_TIMEOUT_MS)
  })
  const sessionId = getPostHogSessionId()
  const refresh = Promise.resolve()
    .then(() =>
      fetch('/api/store/cart/analytics-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
        signal: controller.signal,
      })
    )
    .then(() => undefined)
    .catch(() => undefined)

  try {
    await Promise.race([refresh, timedOut])
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

/** Refresh consent-bound attribution and record one real provider attempt. */
export async function beginCheckoutPaymentAttempt(
  context: CheckoutPaymentLifecycleContext
): Promise<void> {
  await refreshCheckoutAttribution(context.cartId)
  trackClientEvent(
    'checkout_payment_started',
    buildCheckoutPaymentEventProperties(context)
  )
}

/** Record a surfaced failure through the single privacy-reviewed allowlist. */
export function captureCheckoutPaymentFailure(
  context: CheckoutPaymentLifecycleContext,
  failureKind: unknown
): void {
  trackClientEvent(
    'checkout_payment_failed',
    buildCheckoutPaymentEventProperties({ ...context, failureKind })
  )
}
