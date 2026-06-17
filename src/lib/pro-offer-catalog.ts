import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import {
  formatPrice,
  getProducts,
  getVariantPrice,
} from '@/services/core/external/medusa-client'
import type { PlanId } from '@/lib/plans'
import { getPlanByHandle } from '@/lib/plans'
import type { MedusaProduct } from '@/types/medusa'

const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'
const DEFAULT_CURRENCY_CODE = 'usd'

interface ProOfferCopy {
  description: string
  priceSuffix: string | null
  schemaName: string
  features: string[]
  featured: boolean
  badgeLabel: string | null
}

const OFFER_COPY: Record<PlanId, ProOfferCopy> = {
  yearly: {
    description: 'One-year license',
    priceSuffix: '/year',
    schemaName: 'Yearly License',
    featured: true,
    badgeLabel: 'Most Popular',
    features: [
      'All Pro features included',
      'Unlimited orders & products',
      'Priority email support',
      'Automatic updates for 1 year',
      'Manual renewal — no automatic billing',
    ],
  },
  lifetime: {
    description: 'One-time purchase',
    priceSuffix: null,
    schemaName: 'Lifetime License',
    featured: false,
    badgeLabel: null,
    features: [
      'All Pro features included',
      'Unlimited orders & products',
      'Priority email support',
      'Lifetime updates forever',
      'One-time payment',
      'Best value for long-term use',
    ],
  },
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
  title: string
  description: string
  featured: boolean
  badgeLabel: string | null
  price: ProOfferPrice
  priceSuffix: string | null
  features: string[]
  /** Checkout path containing the Medusa variant choice. Callers append metadata through buildProCheckoutHref. */
  checkoutPath: string
}

export interface ProOfferCatalog {
  offers: ProOffer[]
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

export function buildProOfferCatalog(
  products: MedusaProduct[],
  currencyCode: string = DEFAULT_CURRENCY_CODE
): ProOffer[] {
  return products
    .map((product): ProOffer | null => {
      const plan = getPlanByHandle(product.handle)
      if (!plan) return null

      const variant = product.variants[0]
      if (!variant) return null

      const amount = getVariantPrice(variant, currencyCode)
      if (amount === null) return null

      const copy = OFFER_COPY[plan.id]
      const checkoutParams = new URLSearchParams({
        variant: variant.id,
        product: plan.handle,
      })

      return {
        planId: plan.id,
        handle: plan.handle,
        title: product.title,
        description: copy.description,
        featured: copy.featured,
        badgeLabel: copy.badgeLabel,
        price: {
          amount,
          currencyCode,
          formatted: formatPrice(amount, currencyCode),
          compact: compactPrice(amount, currencyCode),
          schemaPrice: schemaPrice(amount),
        },
        priceSuffix: copy.priceSuffix,
        features: [...copy.features],
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
