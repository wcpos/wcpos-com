import { describe, expect, it } from 'vitest'
import type { MedusaProduct } from '@/types/medusa'
import {
  buildProCheckoutHref,
  buildProOfferCatalog,
  buildProOfferSchemaOffers,
  formatFounderProPriceSummary,
  formatHomeProPriceSummary,
  getProCheckoutCtaLabel,
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
      title: 'WCPOS Pro Yearly',
      featured: true,
      badgeLabel: 'Most Popular',
      description: 'One-year license',
      price: {
        amount: 129,
        currencyCode: 'usd',
        formatted: '$129.00',
        schemaPrice: '129',
      },
      priceSuffix: '/year',
      checkoutPath: '/pro/checkout?variant=variant_yearly&product=wcpos-pro-yearly',
    })
    expect(offers[0].features).toContain('Automatic updates for 1 year')
    expect(offers[0].features).toContain('Manual renewal — no automatic billing')
    expect(offers[0].features).not.toContain('Cancel anytime')
    expect(offers[1]).toMatchObject({
      planId: 'lifetime',
      featured: false,
      description: 'One-time purchase',
      priceSuffix: null,
      checkoutPath:
        '/pro/checkout?variant=variant_lifetime&product=wcpos-pro-lifetime',
    })
  })

  it('omits offers without a USD variant price', () => {
    const yearly = product('wcpos-pro-yearly', 129, 'variant_yearly')
    yearly.variants[0].prices = [{ id: 'price_eur', currency_code: 'eur', amount: 119 }]

    expect(buildProOfferCatalog([yearly])).toEqual([])
  })
})

describe('offer presentation helpers', () => {
  const offers = buildProOfferCatalog([
    product('wcpos-pro-yearly', 129, 'variant_yearly'),
    product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
  ])

  it('builds checkout hrefs with experiment metadata without exposing query details to cards', () => {
    expect(buildProCheckoutHref(offers[0], 'value_copy')).toBe(
      '/pro/checkout?variant=variant_yearly&product=wcpos-pro-yearly&exp=pro_checkout_v1&exp_variant=value_copy'
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

  it('centralizes checkout CTA copy', () => {
    expect(getProCheckoutCtaLabel('control')).toBe('Get Started')
    expect(getProCheckoutCtaLabel('value_copy')).toBe('Get Instant Access')
  })
})
