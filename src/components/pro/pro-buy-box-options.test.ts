import { describe, expect, it } from 'vitest'
import { buildProBuyBoxOptions } from './pro-buy-box-options'
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

const offers = buildProOfferCatalog([
  product('wcpos-pro-yearly', 129, 'variant_yearly'),
  product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
])

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
      badgeLabel: 'buyBox.yearly.badgeLabel',
      priceText: '$129',
      priceSuffix: 'buyBox.yearly.priceSuffix',
      ctaNote: 'buyBox.yearly.ctaNote',
    })
    expect(options[1].badgeLabel).toBeNull()
    expect(options[1].priceText).toBe('$399')
  })

  it('derives the lifetime years claim from the live prices', () => {
    const options = buildProBuyBoxOptions(offers, 'control', t)
    expect(options[1].ctaNote).toBe('buyBox.lifetime.ctaNote|{"years":3}')

    // $199 yearly vs $399 lifetime → 2 years, still claimable
    const closerOffers = buildProOfferCatalog([
      product('wcpos-pro-yearly', 199, 'variant_yearly'),
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
    ])
    expect(buildProBuyBoxOptions(closerOffers, 'control', t)[1].ctaNote).toBe(
      'buyBox.lifetime.ctaNote|{"years":2}'
    )

    const fractionalOffers = buildProOfferCatalog([
      product('wcpos-pro-yearly', 250, 'variant_yearly'),
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
    ])
    expect(
      buildProBuyBoxOptions(fractionalOffers, 'control', t)[1].ctaNote
    ).toBe('buyBox.lifetime.ctaNoteSimple')
  })

  it('falls back to the simple lifetime note when the ratio is not a selling point', () => {
    const nearParity = buildProOfferCatalog([
      product('wcpos-pro-yearly', 350, 'variant_yearly'),
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
    ])
    expect(buildProBuyBoxOptions(nearParity, 'control', t)[1].ctaNote).toBe(
      'buyBox.lifetime.ctaNoteSimple'
    )

    // No yearly offer present at all → nothing to compare against.
    const lifetimeOnly = buildProOfferCatalog([
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
    ])
    expect(
      buildProBuyBoxOptions(lifetimeOnly, 'control', t)[0].ctaNote
    ).toBe('buyBox.lifetime.ctaNoteSimple')
  })

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
})
