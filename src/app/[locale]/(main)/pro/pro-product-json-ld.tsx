import { getTranslations } from 'next-intl/server'
import {
  applyProOfferCatalogCachePolicy,
  buildProOfferSchemaOffers,
  getProOfferCatalog,
} from '@/lib/pro-offer-catalog'
import {
  getStoreEnvironmentByName,
  type StoreEnvironmentName,
} from '@/lib/store-environment'

const PRO_MESSAGE_NAMESPACE = 'pro'

/**
 * One cached catalog fetch shared by the buy box and the JSON-LD block —
 * keyed by the store environment (beta serves staging prices, wcpos.com
 * serves live; the two must never share a cache entry). Experiment variant
 * and locale stay outside the boundary as pure string work.
 */
export async function getCachedProOfferCatalog(envName: StoreEnvironmentName) {
  'use cache'
  const catalog = await getProOfferCatalog(
    undefined,
    getStoreEnvironmentByName(envName)
  )
  applyProOfferCatalogCachePolicy(catalog)
  return catalog
}

export async function ProProductJsonLd({ locale }: { locale: string }) {
  // SEO metadata is prerendered into the shared static shell — always live.
  const [t, { offers }] = await Promise.all([
    getTranslations({ locale, namespace: PRO_MESSAGE_NAMESPACE }),
    getCachedProOfferCatalog('live'),
  ])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: t('schema.name'),
          description: t('schema.description'),
          brand: {
            '@type': 'Organization',
            name: 'WCPOS',
          },
          offers: buildProOfferSchemaOffers(offers),
        }),
      }}
    />
  )
}
