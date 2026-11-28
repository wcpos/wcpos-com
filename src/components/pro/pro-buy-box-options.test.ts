import { describe, expect, it } from 'vitest'
import {
  buildPendingProBuyBoxOptions,
  buildProBuyBoxOptions,
} from './pro-buy-box-options'
import { buildProOfferCatalog } from '@/lib/pro-offer-catalog'
import type { MedusaProduct } from '@/types/medusa'

function product(
  handle: string,
  amount: number,
  variantId: string
): MedusaProduct {
  return {
    id: `prod_${handle}`,
    title: handle,
    handle,
    description: null,
    status: 'published',
    thumbnail: null,
    images: [],
    options: [],
    variants: [
      {
        id: variantId,
        title: 'Default',
        sku: null,
        prices: [{ id: `price_${variantId}`, currency_code: 'usd', amount }],
        options: {},
        manage_inventory: false,
      },
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const fixtureProducts = [
  product('wcpos-pro-yearly', 129, 'variant_yearly'),
  product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
]

const offers = buildProOfferCatalog(fixtureProducts)

// Echo translator: returns the key (with interpolations appended) so
// assertions can verify which message key and values were requested.
const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}|${JSON.stringify(values)}` : key

describe('buildProBuyBoxOptions', () => {
  it('maps offers to options with catalog prices and message-keyed copy', () => {
    const options = buildProBuyBoxOptions(offers, 'control', t)

    expect(options.map((option) => option.planId)).toEqual([
      'yearly',
      'lifetime',
    ])
    expect(options[0]).toMatchObject({
      title: 'buyBox.yearly.title',
      subtitle: 'buyBox.yearly.subtitle',
      priceText: '$129',
      currencyCode: 'USD',
      priceSuffix: 'buyBox.yearly.priceSuffix',
      ctaNote: 'buyBox.yearly.ctaNote',
    })
    expect(options[1].priceText).toBe('$399')
  })

  it('always gives Lifetime the simple note, never a comparison with Yearly', () => {
    for (const [yearly, lifetime] of [
      [129, 399],
      [199, 399],
      [350, 399],
    ]) {
      const priced = buildProOfferCatalog([
        product('wcpos-pro-yearly', yearly, 'variant_yearly'),
        product('wcpos-pro-lifetime', lifetime, 'variant_lifetime'),
      ])
      expect(buildProBuyBoxOptions(priced, 'control', t)[1].ctaNote).toBe(
        'buyBox.lifetime.ctaNoteSimple'
      )
    }

    const lifetimeOnly = buildProOfferCatalog([
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
    ])
    expect(
      buildProBuyBoxOptions(lifetimeOnly, 'control', t)[0].ctaNote
    ).toBe('buyBox.lifetime.ctaNoteSimple')
  })

  it.each(['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'])(
    'names the currency once in every locale (%s)',
    (locale) => {
      const localeOffers = buildProOfferCatalog(fixtureProducts, 'usd', locale)
      for (const option of buildProBuyBoxOptions(localeOffers, 'control', t)) {
        // Compose the text exactly as the buy box renders it.
        const shown =
          option.priceText +
          (option.priceText.includes(option.currencyCode)
            ? ''
            : ` ${option.currencyCode}`)
        const amount = fixtureProducts.find(
          (fixture) => fixture.handle === option.eventProperties.product
        )!.variants[0].prices[0].amount

        expect(shown.match(/USD/g), `${locale}: ${shown}`).toHaveLength(1)
        expect(shown, `${locale}: ${shown}`).not.toMatch(/US\$|\$US/)
        expect(shown, `${locale}: ${shown}`).toContain(String(amount))
      }
    }
  )

  it('bakes the experiment into both the checkout href and the analytics payload', () => {
    const options = buildProBuyBoxOptions(offers, 'value_copy', t)

    expect(options[0].checkoutHref).toBe(
      '/pro/checkout?product=wcpos-pro-yearly&variant=variant_yearly' +
        '&exp=pro_checkout_v1&exp_variant=value_copy'
    )
    expect(options[1].eventProperties).toEqual({
      experiment: 'pro_checkout_v1',
      variant: 'value_copy',
      product: 'wcpos-pro-lifetime',
      plan: 'lifetime',
    })
  })

  it('builds the loading placeholder from the plans, with plain checkout links', () => {
    const pending = buildPendingProBuyBoxOptions(t)

    expect(pending.map((option) => option.planId)).toEqual(['yearly', 'lifetime'])
    expect(pending.map((option) => option.checkoutHref)).toEqual([
      '/pro/checkout?product=wcpos-pro-yearly',
      '/pro/checkout?product=wcpos-pro-lifetime',
    ])
    for (const option of pending) {
      expect(option.priceText).toBe('')
      expect(option.eventProperties).toBeUndefined()
    }
  })
})
