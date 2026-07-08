import { describe, expect, it, vi } from 'vitest'
import type { MedusaProduct } from '@/types/medusa'
import { getProducts } from '@/services/core/external/medusa-client'
import {
  buildProCheckoutHref,
  buildProOfferCatalog,
  buildProOfferSchemaOffers,
  formatFounderProPriceSummary,
  formatHomeProPriceSummary,
  getProCheckoutCtaLabel,
  getProOfferCatalog,
  resolveProOfferCartSelection,
  resolveProOfferCheckoutSelection,
} from './pro-offer-catalog'

vi.mock('@/services/core/external/medusa-client', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/services/core/external/medusa-client')
    >()
  return { ...actual, getProducts: vi.fn() }
})

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

  it('formats customer-facing offer prices with the caller locale', () => {
    const offers = buildProOfferCatalog(
      [product('wcpos-pro-yearly', 129, 'variant_yearly')],
      'usd',
      'fr'
    )

    const formatted = new Intl.NumberFormat('fr', {
      style: 'currency',
      currency: 'USD',
    }).format(129)
    const compact = new Intl.NumberFormat('fr', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(129)

    expect(offers[0].price.formatted).toBe(formatted)
    expect(offers[0].price.compact).toBe(compact)
    expect(offers[0].price.formatted).not.toBe('$129.00')
  })

  it('preserves cents in compact prices when the amount is fractional', () => {
    const offers = buildProOfferCatalog([
      product('wcpos-pro-yearly', 129.99, 'variant_yearly'),
    ])

    expect(offers[0].price.compact).toBe('$129.99')
  })
})

describe('getProOfferCatalog', () => {
  it('serves the committed fallback catalog when Medusa returns no products', async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([])

    const catalog = await getProOfferCatalog()

    expect(catalog.source).toBe('fallback')
    expect(
      catalog.offers.map((offer) => [offer.planId, offer.price.compact])
    ).toEqual([
      ['yearly', '$129'],
      ['lifetime', '$399'],
    ])
    // Fallback offers keep the stable-handle checkout contract intact.
    expect(catalog.offers[0].checkoutPath).toContain(
      'product=wcpos-pro-yearly'
    )
  })

  it('fills only the missing plan when Medusa returns a partial catalog', async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([
      product('wcpos-pro-yearly', 149, 'variant_yearly_live'),
    ])

    const catalog = await getProOfferCatalog()

    expect(catalog.source).toBe('fallback')
    expect(
      catalog.offers.map((offer) => [offer.planId, offer.price.amount])
    ).toEqual([
      ['yearly', 149],
      ['lifetime', 399],
    ])
    // The plan Medusa did resolve keeps its live variant, not the fallback's.
    expect(catalog.offers[0].variantId).toBe('variant_yearly_live')
  })

  it('reports a pure Medusa catalog when both plans resolve', async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([
      product('wcpos-pro-yearly', 129, 'variant_yearly'),
      product('wcpos-pro-lifetime', 399, 'variant_lifetime'),
    ])

    const catalog = await getProOfferCatalog()

    expect(catalog.source).toBe('medusa')
    expect(catalog.offers).toHaveLength(2)
  })

  it('serves fallback prices in the other committed currencies', async () => {
    vi.mocked(getProducts).mockResolvedValueOnce([])

    const catalog = await getProOfferCatalog('eur')

    expect(catalog.offers.map((offer) => offer.price.amount)).toEqual([
      119, 369,
    ])
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

  it('builds shared price summaries from caller-provided translations', () => {
    expect(
      formatHomeProPriceSummary(offers, (values) =>
        `${values.yearly} translated ${values.lifetime} (${values.currency})`
      )
    ).toBe('$129 translated $399 (USD)')
    expect(
      formatFounderProPriceSummary(offers, (values) =>
        `${values.yearly} founder ${values.lifetime}`
      )
    ).toBe('$129 founder $399')
  })

  it('builds schema.org offers from translated plan names and catalog facts', () => {
    expect(
      buildProOfferSchemaOffers(offers, (planId) =>
        planId === 'yearly' ? 'Translated yearly' : 'Translated lifetime'
      )
    ).toEqual([
      {
        '@type': 'Offer',
        name: 'Translated yearly',
        priceCurrency: 'USD',
        price: '129',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Translated lifetime',
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
