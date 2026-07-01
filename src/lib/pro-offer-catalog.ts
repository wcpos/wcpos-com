import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import {
  formatPrice,
  getProducts,
  getVariantPrice,
} from '@/services/core/external/medusa-client'
import type { PlanId } from '@/lib/plans'
import { getPlanByHandle } from '@/lib/plans'
import type { MedusaProduct, MedusaProductVariant } from '@/types/medusa'

const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'
const DEFAULT_CURRENCY_CODE = 'usd'

/**
 * Schema.org copy only. Customer-facing plan copy lives in the `pro.buyBox`
 * message namespace (10 locales) — the catalog carries domain data (prices,
 * handles, checkout paths), not display prose.
 */
interface ProOfferCopy {
  schemaName: string
}

const OFFER_COPY: Record<PlanId, ProOfferCopy> = {
  yearly: { schemaName: 'Yearly License' },
  lifetime: { schemaName: 'Lifetime License' },
}

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
  /** Current Medusa variant selected by the Pro offer catalog. */
  variantId: string
  price: ProOfferPrice
  /** Checkout path containing the stable Pro offer choice. Callers append metadata through buildProCheckoutHref. */
  checkoutPath: string
}

export interface ProOfferCatalog {
  offers: ProOffer[]
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

function compactPrice(amount: number, currencyCode: string): string {
  return formatPrice(amount, currencyCode).replace(/\.00$/, '')
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
  currencyCode: string = DEFAULT_CURRENCY_CODE
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
        variantId: variant.id,
        price: {
          amount,
          currencyCode,
          formatted: formatPrice(amount, currencyCode),
          compact: compactPrice(amount, currencyCode),
          schemaPrice: schemaPrice(amount),
        },
        checkoutPath: `/pro/checkout?${checkoutParams.toString()}`,
      }
    })
    .filter((offer): offer is ProOffer => offer !== null)
    .sort(sortByPlanOrder)
}

export async function getProOfferCatalog(
  currencyCode: string = DEFAULT_CURRENCY_CODE
): Promise<ProOfferCatalog> {
  const products = await getProducts()
  return { offers: buildProOfferCatalog(products, currencyCode) }
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

export function getProCheckoutCtaLabel(
  experimentVariant: ProCheckoutVariant
): string {
  return experimentVariant === 'value_copy' ? 'Get Instant Access' : 'Get Started'
}

function getOffer(offers: ProOffer[], planId: PlanId): ProOffer | null {
  return offers.find((offer) => offer.planId === planId) ?? null
}

export function formatHomeProPriceSummary(offers: ProOffer[]): string | null {
  const yearly = getOffer(offers, 'yearly')
  const lifetime = getOffer(offers, 'lifetime')
  if (!yearly || !lifetime) return null

  return `${yearly.price.compact}/year or ${lifetime.price.compact} lifetime. No per-register fees.`
}

export function formatFounderProPriceSummary(offers: ProOffer[]): string | null {
  const yearly = getOffer(offers, 'yearly')
  const lifetime = getOffer(offers, 'lifetime')
  if (!yearly || !lifetime) return null

  return `${yearly.price.compact}/yr or ${lifetime.price.compact} once`
}

export function buildProOfferSchemaOffers(offers: ProOffer[]) {
  return offers.map((offer) => ({
    '@type': 'Offer',
    name: OFFER_COPY[offer.planId].schemaName,
    priceCurrency: offer.price.currencyCode.toUpperCase(),
    price: offer.price.schemaPrice,
    availability: 'https://schema.org/InStock',
  }))
}
