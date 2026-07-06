/**
 * Payment-method availability: the intersection of what this deployment is
 * configured to offer (store-environment.ts) and what the host-keyed Medusa
 * backend actually registers on its region.
 *
 * The two drift independently — the 2026-07-02 beta outage was the test
 * environment defaulting to BTCPay while the staging backend had no BTCPay
 * provider registered, so the very first payment-session call 500'd and the
 * whole checkout died. Filtering here turns that class of drift into either
 * a working alternative method or the checkout's explicit "no payment
 * methods" state.
 *
 * Pure module (no server-only imports): the same provider-id vocabulary is
 * used by the client checkout when it creates payment sessions.
 */

import type { CheckoutPaymentConfig } from './checkout-payment-config'

export const PAYMENT_METHOD_PROVIDER_IDS: Record<
  'stripe' | 'paypal' | 'btcpay',
  string
> = {
  stripe: 'pp_stripe_stripe',
  paypal: 'pp_paypal_paypal',
  btcpay: 'pp_btcpay_btcpay',
}

/**
 * Drop configured payment methods whose Medusa provider is not registered on
 * the backend. `providerIds: null` means the backend could not be asked
 * (Medusa down, mock without the endpoint) — fail open and keep the
 * configured methods rather than bricking checkout on a transient error.
 */
export function filterPaymentsByBackendProviders(
  payments: CheckoutPaymentConfig,
  providerIds: readonly string[] | null
): CheckoutPaymentConfig {
  if (providerIds === null) return payments

  const available = new Set(providerIds)

  return {
    stripePublishableKey: available.has(PAYMENT_METHOD_PROVIDER_IDS.stripe)
      ? payments.stripePublishableKey
      : null,
    paypal: available.has(PAYMENT_METHOD_PROVIDER_IDS.paypal)
      ? payments.paypal
      : null,
    btcpayEnabled:
      payments.btcpayEnabled &&
      available.has(PAYMENT_METHOD_PROVIDER_IDS.btcpay),
  }
}
