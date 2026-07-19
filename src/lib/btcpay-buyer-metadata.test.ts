import { describe, expect, it } from 'vitest'
import { btcpaySessionData } from './btcpay-buyer-metadata'

const cart = {
  email: '  ada@example.com  ',
  billing_address: {
    first_name: '  Ada ',
    last_name: ' Lovelace  ',
    company: ' Analytical Engines ApS ',
    address_1: ' Vesterbrogade 1 ',
    address_2: '   ',
    city: ' København V ',
    province: '',
    postal_code: ' 1620 ',
    country_code: ' dk ',
  },
  metadata: {
    locale: ' da ',
    taxNumber: 'DK123',
    arbitrary: 'must-not-leak',
  },
}

describe('btcpaySessionData', () => {
  it('projects only allowlisted buyer metadata from a complete cart', () => {
    const result = btcpaySessionData('pp_btcpay_btcpay', cart)

    expect(result).toEqual({
      locale: 'da',
      metadata: {
        buyerName: 'Ada Lovelace',
        buyerEmail: 'ada@example.com',
        buyerCompany: 'Analytical Engines ApS',
        buyerAddress1: 'Vesterbrogade 1',
        buyerCity: 'København V',
        buyerZip: '1620',
        buyerCountry: 'DK',
      },
    })
    expect(result?.metadata).not.toHaveProperty('buyerAddress2')
    expect(result?.metadata).not.toHaveProperty('buyerState')
    expect(result?.metadata).not.toHaveProperty('taxNumber')
  })

  it.each(['pp_stripe_stripe', 'pp_paypal_paypal'])(
    'returns undefined for %s',
    (providerId) => {
      expect(btcpaySessionData(providerId, cart)).toBeUndefined()
    }
  )
})
