import { describe, expect, it } from 'vitest'
import {
  SHARED_CLIENT_NAMESPACES,
  clientMessages,
  pickMessages,
} from './client-messages'

const messages = {
  common: { ok: 'OK' },
  footer: { theme: 'Theme' },
  consent: { accept: 'Accept' },
  errors: { notFound: 'Not found' },
  header: { nav: { home: 'Home' } },
  roadmap: { page: { title: 'Roadmap' } },
  pro: {
    checkout: {
      title: 'Checkout',
      payment: { paypal: 'PayPal' },
    },
    marketing: { title: 'Pro' },
  },
  account: {
    productTitles: { pro: 'WCPOS Pro' },
    profile: { taxLabels: { eu_vat: 'VAT' } },
    orders: { title: 'Orders' },
  },
  home: {
    story: { title: 'Story' },
    features: { title: 'Features' },
  },
}

describe('pickMessages', () => {
  it('picks top-level namespaces without unrelated siblings', () => {
    expect(pickMessages(messages, ['roadmap'])).toEqual({
      roadmap: { page: { title: 'Roadmap' } },
    })
  })

  it('picks dot-path namespaces and rebuilds their nested shape', () => {
    expect(
      pickMessages(messages, ['pro.checkout', 'account.productTitles'])
    ).toEqual({
      pro: {
        checkout: {
          title: 'Checkout',
          payment: { paypal: 'PayPal' },
        },
      },
      account: {
        productTitles: { pro: 'WCPOS Pro' },
      },
    })
  })

  it('skips missing keys silently', () => {
    expect(
      pickMessages(messages, ['home.story', 'home.missing', 'missing'])
    ).toEqual({
      home: {
        story: { title: 'Story' },
      },
    })
  })
})

describe('clientMessages', () => {
  it('returns shared client namespaces plus route extras', () => {
    expect(SHARED_CLIENT_NAMESPACES).toEqual([
      'common',
      'footer',
      'consent',
      'errors',
      'header',
    ])
    expect(clientMessages(messages, ['home.story'])).toEqual({
      common: { ok: 'OK' },
      footer: { theme: 'Theme' },
      consent: { accept: 'Accept' },
      errors: { notFound: 'Not found' },
      header: { nav: { home: 'Home' } },
      home: { story: { title: 'Story' } },
    })
  })
})
