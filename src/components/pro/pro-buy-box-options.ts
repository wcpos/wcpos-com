import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import type { PlanId } from '@/lib/plans'
import { buildProCheckoutHref, type ProOffer } from '@/lib/pro-offer-catalog'

/**
 * Maps catalog offers to buy-box options: copy from the `pro.buyBox`
 * message namespace, prices/hrefs from the catalog, and the analytics
 * payload built server-side so the client component carries a single
 * source for "where does this CTA go and what does it report".
 *
 * The lifetime note never compares Lifetime with Yearly: Lifetime stays
 * available but is not sold against Yearly (owner ruling).
 */
export interface ProBuyBoxOption {
  planId: PlanId
  title: string
  subtitle: string
  priceText: string
  /** ISO currency code (e.g. USD) shown beside the price so "$" is unambiguous. */
  currencyCode: string
  priceSuffix: string
  ctaNote: string
  checkoutHref: string
  eventProperties: ProBuyBoxEventProperties
}

export type ProBuyBoxEventProperties = {
  experiment: 'pro_checkout_v1'
  variant: ProCheckoutVariant
  product: string
  plan: PlanId
}

export type TranslateFn = (
  key: string,
  values?: Record<string, string | number>
) => string

export function buildProBuyBoxOptions(
  offers: ProOffer[],
  experimentVariant: ProCheckoutVariant,
  t: TranslateFn
): ProBuyBoxOption[] {
  return offers.map((offer) => ({
    planId: offer.planId,
    title: t(`buyBox.${offer.planId}.title`),
    subtitle: t(`buyBox.${offer.planId}.subtitle`),
    // Narrow symbol ("$") + the ISO code the buy box appends reads "$129 USD" in every locale; default display would double it ("US$ 129 USD").
    priceText: offer.price.compactNarrow,
    currencyCode: offer.price.currencyCode.toUpperCase(),
    priceSuffix: t(`buyBox.${offer.planId}.priceSuffix`),
    ctaNote:
      offer.planId === 'lifetime'
        ? t('buyBox.lifetime.ctaNoteSimple')
        : t('buyBox.yearly.ctaNote'),
    checkoutHref: buildProCheckoutHref(offer, experimentVariant),
    eventProperties: {
      experiment: 'pro_checkout_v1',
      variant: experimentVariant,
      product: offer.handle,
      plan: offer.planId,
    },
  }))
}
