import { describe, expect, it } from 'vitest'
import type { MedusaProduct } from '@/types/medusa'
import {
  buildProCheckoutHref,
  buildProOfferCatalog,
  buildProOfferSchemaOffers,
  formatFounderProPriceSummary,
  formatHomeProPriceSummary,
  getProCheckoutCtaLabel,
  resolveProOfferCartSelection,
  resolveProOfferCheckoutSelection,
} from './pro-offer-catalog'

function product(handle: string, amount: number, variantId: string): MedusaProduct {
  return {
    id: `prod_${handle}`,
    title: handle === 'wcpos-pro-yearly' ? 'WCPOS Pro Yearly' : 'WCPOS Pro Lifetime',
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

describe('buildProOfferCatalog', () => {
  it('returns ordered Pro offers with Medusa details hidden behind offer facts', () => {
    const offers = buildProOfferCatalog([
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
      { ...product('wcpos-pro-monthly', 29, 'variant_monthly'), title: 'Monthly' },
      product('wcpos-pro-yearly', 129, 'variant_yearly'),
    ])

    expect(offers.map((offer) => offer.planId)).toEqual(['yearly', 'lifetime'])
    expect(offers[0]).toMatchObject({
      planId: 'yearly',
      handle: 'wcpos-pro-yearly',
      price: {
        amount: 129,
        currencyCode: 'usd',
        formatted: '$129.00',
        compact: '$129',
        schemaPrice: '129',
      },
      checkoutPath:
        '/pro/checkout?product=wcpos-pro-yearly&variant=variant_yearly',
    })
    expect(offers[1]).toMatchObject({
      planId: 'lifetime',
      handle: 'wcpos-pro-lifetime',
      checkoutPath:
        '/pro/checkout?product=wcpos-pro-lifetime&variant=variant_lifetime',
    })
  })

  it('omits offers without a USD variant price', () => {
    const yearly = product('wcpos-pro-yearly', 129, 'variant_yearly')
    yearly.variants[0].prices = [{ id: 'price_eur', currency_code: 'eur', amount: 119 }]

    expect(buildProOfferCatalog([yearly])).toEqual([])
  })

  it('omits offers when the current Pro variant is ambiguous', () => {
    const yearly = product('wcpos-pro-yearly', 129, 'variant_yearly')
    yearly.variants.push({
      ...yearly.variants[0],
      id: 'variant_yearly_second',
    })

    expect(buildProOfferCatalog([yearly])).toEqual([])
  })
})

describe('resolveProOfferCheckoutSelection', () => {
  const offers = buildProOfferCatalog([
    product('wcpos-pro-yearly', 129, 'variant_yearly_current'),
    product('wcpos-pro-lifetime', 399, 'variant_lifetime_current'),
  ])

  it('resolves a current Pro offer from the stable product handle', () => {
    expect(
      resolveProOfferCheckoutSelection(offers, {
        product: 'wcpos-pro-yearly',
      })
    ).toEqual({
      planId: 'yearly',
      handle: 'wcpos-pro-yearly',
      variantId: 'variant_yearly_current',
    })
  })

  it('accepts a legacy variant param only when it matches the current Pro offer', () => {
    expect(
      resolveProOfferCheckoutSelection(offers, {
        variant: 'variant_lifetime_current',
      })
    ).toEqual({
      planId: 'lifetime',
      handle: 'wcpos-pro-lifetime',
      variantId: 'variant_lifetime_current',
    })

    expect(
      resolveProOfferCheckoutSelection(offers, {
        product: 'wcpos-pro-yearly',
        variant: 'variant_lifetime_current',
      })
    ).toBeNull()
  })

  it('rejects unknown products and non-current variant ids', () => {
    expect(
      resolveProOfferCheckoutSelection(offers, {
        product: 'wcpos-pro-monthly',
      })
    ).toBeNull()
    expect(
      resolveProOfferCheckoutSelection(offers, {
        variant: 'variant_old_yearly',
      })
    ).toBeNull()
  })
})

describe('resolveProOfferCartSelection', () => {
  const offers = buildProOfferCatalog([
    product('wcpos-pro-yearly', 129, 'variant_yearly_current'),
    product('wcpos-pro-lifetime', 399, 'variant_lifetime_current'),
  ])

  it('resolves a cart with exactly one current Pro offer line item', () => {
    expect(
      resolveProOfferCartSelection(offers, {
        items: [{ variant_id: 'variant_yearly_current', quantity: 1 }],
      })
    ).toEqual({
      planId: 'yearly',
      handle: 'wcpos-pro-yearly',
      variantId: 'variant_yearly_current',
    })
  })

  it('rejects empty, multi-item, multi-quantity, and non-current carts', () => {
    expect(resolveProOfferCartSelection(offers, { items: [] })).toBeNull()
    expect(
      resolveProOfferCartSelection(offers, {
        items: [
          { variant_id: 'variant_yearly_current', quantity: 1 },
          { variant_id: 'variant_lifetime_current', quantity: 1 },
        ],
      })
    ).toBeNull()
    expect(
      resolveProOfferCartSelection(offers, {
        items: [{ variant_id: 'variant_yearly_current', quantity: 2 }],
      })
    ).toBeNull()
    expect(
      resolveProOfferCartSelection(offers, {
        items: [{ variant_id: 'variant_old_yearly', quantity: 1 }],
      })
    ).toBeNull()
  })
})

describe('offer presentation helpers', () => {
  const offers = buildProOfferCatalog([
    product('wcpos-pro-yearly', 129, 'variant_yearly'),
    product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
  ])

  it('builds checkout hrefs with experiment metadata without exposing query details to cards', () => {
    expect(buildProCheckoutHref(offers[0], 'value_copy')).toBe(
      '/pro/checkout?product=wcpos-pro-yearly&variant=variant_yearly' +
        '&exp=pro_checkout_v1&exp_variant=value_copy'
    )
  })

  it('builds shared price summaries for marketing surfaces', () => {
    expect(formatHomeProPriceSummary(offers)).toBe(
      '$129/year or $399 lifetime. No per-register fees.'
    )
    expect(formatFounderProPriceSummary(offers)).toBe('$129/yr or $399 once')
  })

  it('builds schema.org offers from the same catalog facts', () => {
    expect(buildProOfferSchemaOffers(offers)).toEqual([
      {
        '@type': 'Offer',
        name: 'Yearly License',
        priceCurrency: 'USD',
        price: '129',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Lifetime License',
        priceCurrency: 'USD',
        price: '399',
        availability: 'https://schema.org/InStock',
      },
    ])
  })

  it('centralizes checkout CTA translation keys', () => {
    const t = (key: 'buyBox.cta' | 'buyBox.ctaValueCopy') => key

    expect(getProCheckoutCtaLabel('control', t)).toBe('buyBox.cta')
    expect(getProCheckoutCtaLabel('value_copy', t)).toBe(
      'buyBox.ctaValueCopy'
    )
  })
})
