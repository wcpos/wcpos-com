import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { PLANS, type PlanId } from '@/lib/plans'
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
  /** Absent only on the placeholder shown while prices load, which never tracks. */
  eventProperties?: ProBuyBoxEventProperties
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
): Array<ProBuyBoxOption & { eventProperties: ProBuyBoxEventProperties }> {
  return offers.map((offer) => ({
    ...planCopy(offer.planId, t),
    // Narrow symbol ("$") + the ISO code the buy box appends reads "$129 USD" in every locale; default display would double it ("US$ 129 USD").
    priceText: offer.price.compactNarrow,
    currencyCode: offer.price.currencyCode.toUpperCase(),
    checkoutHref: buildProCheckoutHref(offer, experimentVariant),
    eventProperties: {
      experiment: 'pro_checkout_v1',
      variant: experimentVariant,
      product: offer.handle,
      plan: offer.planId,
    },
  }))
}

function planCopy(planId: PlanId, t: TranslateFn) {
  return {
    planId,
    title: t(`buyBox.${planId}.title`),
    subtitle: t(`buyBox.${planId}.subtitle`),
    priceSuffix: t(`buyBox.${planId}.priceSuffix`),
    ctaNote:
      planId === 'lifetime'
        ? t('buyBox.lifetime.ctaNoteSimple')
        : t('buyBox.yearly.ctaNote'),
  }
}

/**
 * The buy box drawn while prices load: every plan with its terms, no
 * figures, and a plain checkout link per plan (checkout validates the plan
 * and shows the price before payment).
 */
export function buildPendingProBuyBoxOptions(
  t: TranslateFn
): ProBuyBoxOption[] {
  return PLANS.map((plan) => ({
    ...planCopy(plan.id, t),
    priceText: '',
    currencyCode: '',
    checkoutHref: `/pro/checkout?product=${plan.handle}`,
  }))
}
