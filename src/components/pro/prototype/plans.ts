/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Static plan copy + stubbed price fetch for the /pro pricing variants.
 * Question being answered: "What should the /pro pricing section look like,
 * and how little of it can we suspend while Medusa prices load?"
 *
 * Everything here except the price is knowable without Medusa (mirrors
 * OFFER_COPY in src/lib/pro-offer-catalog.ts). The price fetch is stubbed
 * with the live prices and an artificial delay so the loading behaviour is
 * visible in dev — the real implementation would call getProOfferCatalog().
 */

export type PrototypePlanId = 'yearly' | 'lifetime'

export interface PrototypePlan {
  planId: PrototypePlanId
  handle: string
  title: string
  description: string
  priceSuffix: string | null
  featured: boolean
  badgeLabel: string | null
  features: string[]
  checkoutHref: string
}

export const PROTOTYPE_PLANS: Record<PrototypePlanId, PrototypePlan> = {
  yearly: {
    planId: 'yearly',
    handle: 'wcpos-pro-yearly',
    title: 'Pro Yearly',
    description: 'One-year license',
    priceSuffix: '/year',
    featured: true,
    badgeLabel: 'Most Popular',
    features: [
      'All Pro features included',
      'Unlimited orders & products',
      'Priority email support',
      'Automatic updates for 1 year',
      'Manual renewal — no automatic billing',
    ],
    checkoutHref: '/pro/checkout?product=wcpos-pro-yearly',
  },
  lifetime: {
    planId: 'lifetime',
    handle: 'wcpos-pro-lifetime',
    title: 'Pro Lifetime',
    description: 'One-time purchase',
    priceSuffix: null,
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
    checkoutHref: '/pro/checkout?product=wcpos-pro-lifetime',
  },
}

/** Features shared by both plans — used by variants that list features once. */
export const SHARED_FEATURES = [
  'Payment terminal integration',
  'Stock & price editing in POS',
  'Order history & management',
  'Customer management',
  'End-of-day reports',
  'Custom payment gateways',
  'Priority email support',
]

export interface PrototypePrice {
  formatted: string
  compact: string
}

const STUB_PRICES: Record<PrototypePlanId, PrototypePrice> = {
  yearly: { formatted: '$129.00', compact: '$129' },
  lifetime: { formatted: '$399.00', compact: '$399' },
}

/** Stub for the Medusa-backed price lookup, with a visible artificial delay. */
export async function fetchStubPrice(
  planId: PrototypePlanId,
  delayMs: number
): Promise<PrototypePrice> {
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return STUB_PRICES[planId]
}
