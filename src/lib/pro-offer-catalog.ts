import { cacheLife, cacheTag } from 'next/cache'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import {
  formatPrice,
  getProducts,
  getVariantPrice,
} from '@/services/core/external/medusa-client'
import { storeLogger } from '@/lib/logger'
import type { PlanId } from '@/lib/plans'
import { getPlanByHandle, YEARLY_PRO_HANDLE } from '@/lib/plans'
import type { StoreEnvironment } from '@/lib/store-environment'
import type { MedusaProduct, MedusaProductVariant } from '@/types/medusa'

const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'
const DEFAULT_CURRENCY_CODE = 'usd'

function fallbackProduct(
  handle: string,
  title: string,
  variantId: string,
  prices: Record<string, number>
): MedusaProduct {
  return {
    id: `fallback_${handle}`,
    title,
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
        prices: Object.entries(prices).map(([currency_code, amount]) => ({
          id: `fallback_price_${handle}_${currency_code}`,
          currency_code,
          amount,
        })),
        options: {},
        manage_inventory: false,
      },
    ],
    created_at: '2026-07-02T00:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
  }
}

/**
 * Committed offer facts served when Medusa cannot — the purchase funnel must
 * never render empty because the store backend is unreachable (config in
 * code; a price change in Medusa must be mirrored here). Snapshot of the
 * live catalog as of 2026-07-02, including the live variant ids so checkout
 * links built from a fallback catalog validate against the real catalog once
 * the backend answers again.
 */
const FALLBACK_PRO_PRODUCTS: MedusaProduct[] = [
  fallbackProduct(
    YEARLY_PRO_HANDLE,
    'WCPOS Pro Yearly',
    'variant_01KEMXD1D4HTKKP730PF2DP2W8',
    { usd: 129, eur: 119, gbp: 99, aud: 199 }
  ),
  fallbackProduct(
    'wcpos-pro-lifetime',
    'WCPOS Pro Lifetime',
    'variant_01KEMXD1D426KGZXJQXE7BA16M',
    { usd: 399, eur: 369, gbp: 319, aud: 599 }
  ),
]

export const PRO_TEASER_FEATURES = [
  'Payment terminal integration',
  'Stock & price editing in POS',
  'Order history & management',
  'Customer management',
  'End-of-day reports',
  'Custom payment gateways',
  'Priority support',
]

export interface ProOfferPrice {
  amount: number
  currencyCode: string
  formatted: string
  compact: string
  schemaPrice: string
}

export interface ProOffer {
  planId: PlanId
  handle: string
  title: string
  /** Current Medusa variant selected by the Pro offer catalog. */
  variantId: string
  price: ProOfferPrice
  /** Checkout path containing the stable Pro offer choice. Callers append metadata through buildProCheckoutHref. */
  checkoutPath: string
}

export type ProOfferCatalogSource = 'medusa' | 'fallback'

export interface ProOfferCatalog {
  offers: ProOffer[]
  /**
   * 'fallback' when any offer came from the committed price table instead of
   * Medusa — callers may cache such catalogs on a shorter profile so real
   * prices return quickly after the backend recovers.
   */
  source: ProOfferCatalogSource
}

export interface ProOfferCheckoutSelection {
  planId: PlanId
  handle: string
  variantId: string
}

export interface ProOfferCheckoutInput {
  /** Stable Pro offer handle, for example wcpos-pro-yearly. */
  product?: string
  /** Legacy Medusa variant id accepted only when it matches the current offer. */
  variant?: string
}

export interface ProOfferCartInput {
  items?: Array<{
    variant_id?: string
    quantity?: number
  }>
}

function compactPrice(
  amount: number,
  currencyCode: string,
  locale: string
): string {
  return formatPrice(
    amount,
    currencyCode,
    locale,
    Number.isInteger(amount)
      ? {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }
      : undefined
  )
}

function schemaPrice(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(amount)
}

function sortByPlanOrder(a: ProOffer, b: ProOffer): number {
  const order: Record<PlanId, number> = { yearly: 0, lifetime: 1 }
  return order[a.planId] - order[b.planId]
}

function resolveCurrentProVariant(
  product: MedusaProduct
): MedusaProductVariant | null {
  return product.variants.length === 1 ? product.variants[0] : null
}

export function buildProOfferCatalog(
  products: MedusaProduct[],
  currencyCode: string = DEFAULT_CURRENCY_CODE,
  locale: string = 'en-US'
): ProOffer[] {
  return products
    .map((product): ProOffer | null => {
      const plan = getPlanByHandle(product.handle)
      if (!plan) return null

      const variant = resolveCurrentProVariant(product)
      if (!variant) return null

      const amount = getVariantPrice(variant, currencyCode)
      if (amount === null) return null

      const checkoutParams = new URLSearchParams({
        product: plan.handle,
        // Compatibility hint only: checkout validates product+variant against
        // the current catalog before it lets this reach Medusa.
        variant: variant.id,
      })

      return {
        planId: plan.id,
        handle: plan.handle,
        title: product.title,
        variantId: variant.id,
        price: {
          amount,
          currencyCode,
          formatted: formatPrice(amount, currencyCode, locale),
          compact: compactPrice(amount, currencyCode, locale),
          schemaPrice: schemaPrice(amount),
        },
        checkoutPath: `/pro/checkout?${checkoutParams.toString()}`,
      }
    })
    .filter((offer): offer is ProOffer => offer !== null)
    .sort(sortByPlanOrder)
}

export async function getProOfferCatalog(
  currencyCode: string = DEFAULT_CURRENCY_CODE,
  /**
   * Required inside 'use cache' scopes (where the request host is
   * unavailable); request-scoped callers omit it and the backend resolves
   * from the request host.
   */
  storeEnv?: StoreEnvironment,
  locale: string = 'en-US'
): Promise<ProOfferCatalog> {
  const products = await getProducts(storeEnv)
  const offers = buildProOfferCatalog(products, currencyCode, locale)

  const missing = buildProOfferCatalog(
    FALLBACK_PRO_PRODUCTS,
    currencyCode,
    locale
  ).filter(
    (fallback) => !offers.some((offer) => offer.planId === fallback.planId)
  )
  if (missing.length === 0) return { offers, source: 'medusa' }

  storeLogger.error`Pro offer catalog missing plans from Medusa, serving committed fallback prices: ${missing
    .map((offer) => offer.planId)
    .join(', ')}`
  return {
    offers: [...offers, ...missing].sort(sortByPlanOrder),
    source: 'fallback',
  }
}

/**
 * The one cache policy for 'use cache' scopes that fetch the offer catalog:
 * the shared products profile/tag, tightened to api-short when the catalog
 * carries fallback prices (the shortest cacheLife call wins) so real prices
 * return quickly after the backend recovers. Must run inside the caller's
 * 'use cache' scope — cacheLife/cacheTag attach to that scope's cache entry.
 */
export function applyProOfferCatalogCachePolicy(
  catalog: ProOfferCatalog
): void {
  cacheLife('products')
  cacheTag('products')
  if (catalog.source === 'fallback') cacheLife('api-short')
}

function toCheckoutSelection(offer: ProOffer): ProOfferCheckoutSelection {
  return {
    planId: offer.planId,
    handle: offer.handle,
    variantId: offer.variantId,
  }
}

export function resolveProOfferCheckoutSelection(
  offers: ProOffer[],
  input: ProOfferCheckoutInput
): ProOfferCheckoutSelection | null {
  const product = input.product?.trim()
  const variant = input.variant?.trim()

  if (product) {
    const offer = offers.find((candidate) => candidate.handle === product)
    if (!offer) return null
    if (variant && offer.variantId !== variant) return null
    return toCheckoutSelection(offer)
  }

  if (variant) {
    const offer = offers.find((candidate) => candidate.variantId === variant)
    return offer ? toCheckoutSelection(offer) : null
  }

  return null
}

export function resolveProOfferCartSelection(
  offers: ProOffer[],
  cart: ProOfferCartInput
): ProOfferCheckoutSelection | null {
  const items = cart.items ?? []
  if (items.length !== 1) return null

  const [item] = items
  if (item.quantity !== 1 || typeof item.variant_id !== 'string') return null

  return resolveProOfferCheckoutSelection(offers, { variant: item.variant_id })
}

export function buildProCheckoutHref(
  offer: ProOffer,
  experimentVariant: ProCheckoutVariant
): string {
  const [pathname, query = ''] = offer.checkoutPath.split('?')
  const checkoutParams = new URLSearchParams(query)
  checkoutParams.set('exp', PRO_CHECKOUT_EXPERIMENT)
  checkoutParams.set('exp_variant', experimentVariant)
  return `${pathname}?${checkoutParams.toString()}`
}

type ProCheckoutCtaTranslateFn = (
  key: 'buyBox.cta' | 'buyBox.ctaValueCopy'
) => string

export function getProCheckoutCtaLabel(
  experimentVariant: ProCheckoutVariant,
  t: ProCheckoutCtaTranslateFn
): string {
  return t(
    experimentVariant === 'value_copy' ? 'buyBox.ctaValueCopy' : 'buyBox.cta'
  )
}

function getOffer(offers: ProOffer[], planId: PlanId): ProOffer | null {
  return offers.find((offer) => offer.planId === planId) ?? null
}

type ProPriceSummaryTranslateFn = (values: {
  yearly: string
  lifetime: string
  currency: string
}) => string

export function formatHomeProPriceSummary(
  offers: ProOffer[],
  t: ProPriceSummaryTranslateFn
): string | null {
  const yearly = getOffer(offers, 'yearly')
  const lifetime = getOffer(offers, 'lifetime')
  if (!yearly || !lifetime) return null

  const currency = yearly.price.currencyCode.toUpperCase()
  return t({
    yearly: yearly.price.compact,
    lifetime: lifetime.price.compact,
    currency,
  })
}

export function formatFounderProPriceSummary(
  offers: ProOffer[],
  t: ProPriceSummaryTranslateFn
): string | null {
  const yearly = getOffer(offers, 'yearly')
  const lifetime = getOffer(offers, 'lifetime')
  if (!yearly || !lifetime) return null

  const currency = yearly.price.currencyCode.toUpperCase()
  return t({
    yearly: yearly.price.compact,
    lifetime: lifetime.price.compact,
    currency,
  })
}

export function buildProOfferSchemaOffers(
  offers: ProOffer[],
  planName: (planId: PlanId) => string
) {
  return offers.map((offer) => ({
    '@type': 'Offer',
    name: planName(offer.planId),
    priceCurrency: offer.price.currencyCode.toUpperCase(),
    price: offer.price.schemaPrice,
    availability: 'https://schema.org/InStock',
  }))
}
