import { describe, it, expect } from 'vitest'
import { filterPaymentsByBackendProviders } from './checkout-payments'

const ALL = {
  stripePublishableKey: 'pk_test_x',
  paypalClientId: 'paypal-client',
  btcpayEnabled: true,
}

describe('filterPaymentsByBackendProviders', () => {
  it('keeps configured methods whose provider the backend registers', () => {
    expect(
      filterPaymentsByBackendProviders(ALL, [
        'pp_stripe_stripe',
        'pp_paypal_paypal',
        'pp_btcpay_btcpay',
      ])
    ).toEqual(ALL)
  })

  it('drops methods the backend does not register (2026-07-02 beta outage shape)', () => {
    // Staging registers Stripe only; the config had btcpayEnabled: true and
    // no Stripe key — the checkout must not offer (or default to) BTCPay.
    expect(
      filterPaymentsByBackendProviders(
        { stripePublishableKey: null, paypalClientId: null, btcpayEnabled: true },
        ['pp_stripe_stripe', 'pp_system_default']
      )
    ).toEqual({
      stripePublishableKey: null,
      paypalClientId: null,
      btcpayEnabled: false,
    })
  })

  it('keeps only the intersection when config and backend partially overlap', () => {
    expect(
      filterPaymentsByBackendProviders(ALL, ['pp_stripe_stripe'])
    ).toEqual({
      stripePublishableKey: 'pk_test_x',
      paypalClientId: null,
      btcpayEnabled: false,
    })
  })

  it('fails open when the backend could not be asked', () => {
    expect(filterPaymentsByBackendProviders(ALL, null)).toEqual(ALL)
  })

  it('never enables a method the config disabled', () => {
    expect(
      filterPaymentsByBackendProviders(
        { stripePublishableKey: null, paypalClientId: null, btcpayEnabled: false },
        ['pp_stripe_stripe', 'pp_paypal_paypal', 'pp_btcpay_btcpay']
      )
    ).toEqual({
      stripePublishableKey: null,
      paypalClientId: null,
      btcpayEnabled: false,
    })
  })
})
