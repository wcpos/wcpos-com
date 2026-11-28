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

/** The Pro yearly price line for the downloads rail, from the live yearly offer. */
export async function ProPriceLine({ locale }: { locale: string }) {
  const yearly = (await getCachedOffers(locale)).find((offer) => offer.planId === 'yearly')
  if (!yearly) return null
  return <ProPriceLineText price={yearly.price.compactNarrow} currency={yearly.price.currencyCode.toUpperCase()} />
}

function ProPriceLineText({ price, currency }: { price: string; currency: string }) {
  const t = useTranslations('downloads.page')
  return (
    <p className="mt-2">
      {t.rich('steps.pro.priceLine', {
        price,
        currency,
        b: (chunks) => <b className="font-semibold text-foreground">{chunks}</b>,
      })}
    </p>
  )
}
