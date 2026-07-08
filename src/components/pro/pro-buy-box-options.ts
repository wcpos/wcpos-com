import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import type { PlanId } from '@/lib/plans'
import { buildProCheckoutHref, type ProOffer } from '@/lib/pro-offer-catalog'

/**
 * Maps catalog offers to buy-box options: copy from the `pro.buyBox`
 * message namespace, prices/hrefs from the catalog, and the analytics
 * payload built server-side so the client component carries a single
 * source for "where does this CTA go and what does it report".
 *
 * The lifetime note derives its "≈N years of Yearly" claim from the live
 * prices — never hardcode a price ratio as copy.
 */
export interface ProBuyBoxOption {
  planId: PlanId
  title: string
  subtitle: string
  badgeLabel: string | null
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

type TranslateFn = (
  key: string,
  values?: Record<string, string | number>
) => string

function lifetimeCtaNote(
  offers: ProOffer[],
  t: TranslateFn
): string {
  const yearly = offers.find((offer) => offer.planId === 'yearly')
  const lifetime = offers.find((offer) => offer.planId === 'lifetime')
  const years =
    yearly && lifetime && yearly.price.amount > 0
      ? Math.floor(lifetime.price.amount / yearly.price.amount)
      : null

  return years !== null && years >= 2
    ? t('buyBox.lifetime.ctaNote', { years })
    : t('buyBox.lifetime.ctaNoteSimple')
}

export function buildProBuyBoxOptions(
  offers: ProOffer[],
  experimentVariant: ProCheckoutVariant,
  t: TranslateFn
): ProBuyBoxOption[] {
  return offers.map((offer) => ({
    planId: offer.planId,
    title: t(`buyBox.${offer.planId}.title`),
    subtitle: t(`buyBox.${offer.planId}.subtitle`),
    badgeLabel:
      offer.planId === 'yearly' ? t('buyBox.yearly.badgeLabel') : null,
    priceText: offer.price.compact,
    currencyCode: offer.price.currencyCode.toUpperCase(),
    priceSuffix: t(`buyBox.${offer.planId}.priceSuffix`),
    ctaNote:
      offer.planId === 'lifetime'
        ? lifetimeCtaNote(offers, t)
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
