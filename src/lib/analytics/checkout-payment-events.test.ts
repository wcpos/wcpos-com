import { describe, expect, it } from 'vitest'
import { buildCheckoutPaymentEventProperties } from './checkout-payment-events'

describe('buildCheckoutPaymentEventProperties', () => {
  it('returns only the checkout payment lifecycle allowlist', () => {
    const properties = buildCheckoutPaymentEventProperties({
      paymentProvider: 'stripe',
      failureKind: 'payment_failed',
      plan: 'yearly',
      experiment: 'pro_checkout_v1',
      variant: 'value_copy',
      locale: 'fr-fr',
      error: new Error('RAW GATEWAY ERROR'),
      reference: 'WCPOS-SUPPORT-REF',
      cartId: 'cart_secret',
      orderId: 'order_secret',
      paymentId: 'pi_secret',
      gatewayCode: 'card_declined',
    })

    expect(properties).toEqual({
      payment_provider: 'stripe',
      failure_kind: 'payment_failed',
      plan: 'yearly',
      experiment: 'pro_checkout_v1',
      variant: 'value_copy',
      locale: 'fr-FR',
    })
    expect(Object.keys(properties)).toEqual([
      'payment_provider',
      'failure_kind',
      'plan',
      'experiment',
      'variant',
      'locale',
    ])
    expect(JSON.stringify(properties)).not.toMatch(
      /RAW GATEWAY ERROR|WCPOS-SUPPORT-REF|cart_secret|order_secret|pi_secret|card_declined/
    )
  })

  it('omits failure_kind for a start and rejects unsupported context values', () => {
    expect(
      buildCheckoutPaymentEventProperties({
        paymentProvider: 'raw_gateway_provider',
        plan: 'monthly',
        experiment: 'untrusted_experiment',
        variant: 'untrusted_variant',
        locale: 'not-a-locale',
      })
    ).toEqual({ payment_provider: 'unknown' })
  })

  it('keeps attended renewal lifecycle events distinguishable', () => {
    expect(
      buildCheckoutPaymentEventProperties({
        paymentProvider: 'stripe',
        plan: 'yearly',
        experiment: 'license_renewal',
        variant: 'control',
        locale: 'en',
      })
    ).toEqual({
      payment_provider: 'stripe',
      plan: 'yearly',
      experiment: 'license_renewal',
      variant: 'control',
      locale: 'en',
    })
  })
})
