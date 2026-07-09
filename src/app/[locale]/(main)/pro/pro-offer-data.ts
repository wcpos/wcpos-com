import {
  applyProOfferCatalogCachePolicy,
  getProOfferCatalog,
} from '@/lib/pro-offer-catalog'
import {
  getStoreEnvironmentByName,
  type StoreEnvironmentName,
} from '@/lib/store-environment'

/**
 * One cached catalog fetch shared by the buy box and the JSON-LD block —
 * keyed by the store environment (beta serves staging prices, wcpos.com
 * serves live; the two must never share a cache entry). Experiment variant
 * and locale stay outside the boundary as pure string work.
 */
export async function getCachedProOfferCatalog(
  envName: StoreEnvironmentName,
  locale: string
) {
  'use cache'
  const catalog = await getProOfferCatalog(
    undefined,
    getStoreEnvironmentByName(envName),
    locale
  )
  applyProOfferCatalogCachePolicy(catalog)
  return catalog
}
