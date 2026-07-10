'use client'

import { trackClientEvent } from './client-events'
import { readAnalyticsConsent } from './consent'
import { getPostHogSessionId } from './posthog-browser'
import {
  buildCheckoutPaymentEventProperties,
  type CheckoutPaymentProvider,
} from './checkout-payment-events'

const CHECKOUT_ATTRIBUTION_REFRESH_TIMEOUT_MS = 1000

export class CheckoutConsentWithdrawalBlockedError extends Error {
  constructor() {
    super('CHECKOUT_CONSENT_WITHDRAWAL_NOT_CONFIRMED')
    this.name = 'CheckoutConsentWithdrawalBlockedError'
  }
}

export function isCheckoutConsentWithdrawalBlocked(
  error: unknown
): error is CheckoutConsentWithdrawalBlockedError {
  return error instanceof CheckoutConsentWithdrawalBlockedError
}

export interface CheckoutPaymentLifecycleContext {
  cartId: string
  paymentProvider: CheckoutPaymentProvider
  plan?: unknown
  experiment?: unknown
  variant?: unknown
  locale?: unknown
  [key: string]: unknown
}

type AttributionRefreshResult = {
  acknowledged: boolean
  attributed: boolean
}

async function refreshCheckoutAttribution(
  cartId: string
): Promise<AttributionRefreshResult> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<AttributionRefreshResult>((resolve) => {
    timeout = setTimeout(() => {
      controller.abort()
      resolve({ acknowledged: false, attributed: false })
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
    .then(async (response): Promise<AttributionRefreshResult> => {
      if (!response.ok) {
        return { acknowledged: false, attributed: false }
      }
      const body = (await response.json().catch(() => null)) as {
        attributed?: unknown
      } | null
      return {
        acknowledged: true,
        attributed: body?.attributed === true,
      }
    })
    .catch(() => ({ acknowledged: false, attributed: false }))

  try {
    return await Promise.race([refresh, timedOut])
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

/** Refresh consent-bound attribution and record one real provider attempt. */
export async function beginCheckoutPaymentAttempt(
  context: CheckoutPaymentLifecycleContext
): Promise<void> {
  const refresh = await refreshCheckoutAttribution(context.cartId)
  const currentConsent = readAnalyticsConsent()

  // Consent may change in another tab while the refresh is in flight. When it
  // is now explicitly denied, proceed only after the server positively
  // acknowledges that no attribution envelope remains.
  if (
    currentConsent === 'denied' &&
    (!refresh.acknowledged || refresh.attributed)
  ) {
    throw new CheckoutConsentWithdrawalBlockedError()
  }

  if (!refresh.acknowledged) {
    // A general analytics outage never blocks payment. The sole exception is
    // an explicit withdrawal after this page already received a positive
    // denial that cannot be acknowledged: proceeding could let Medusa reuse
    // an envelope committed by a late/lost response from an earlier request.
    // Re-read after the await so a withdrawal during the refresh is honored.
    return
  }

  if (!refresh.attributed) return

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
