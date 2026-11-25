import { useTranslations } from 'next-intl'
import { applyProOfferCatalogCachePolicy, getProOfferCatalog } from '@/lib/pro-offer-catalog'
import { getLiveStoreEnvironment } from '@/lib/store-environment'

async function getCachedOffers(locale: string) {
  'use cache'

  // Prerendered into the static downloads shell — always live prices.
  const catalog = await getProOfferCatalog(undefined, getLiveStoreEnvironment(), locale)
  applyProOfferCatalogCachePolicy(catalog)
  return catalog.offers
}

/** Starting Pro price for the downloads step-3 card, from the live yearly offer. */
export async function ProPriceLine({ locale }: { locale: string }) {
  const yearly = (await getCachedOffers(locale)).find((offer) => offer.planId === 'yearly')
  if (!yearly) return null
  return <ProPriceLineText price={yearly.price.compactNarrow} currency={yearly.price.currencyCode.toUpperCase()} />
}

function ProPriceLineText({ price, currency }: { price: string; currency: string }) {
  const t = useTranslations('downloads.page')
  return <p className="mt-1 text-sm text-muted-foreground">{t('steps.pro.priceLine', { price, currency })}</p>
}
