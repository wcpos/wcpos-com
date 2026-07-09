import { getTranslations } from 'next-intl/server'
import { buildProOfferSchemaOffers } from '@/lib/pro-offer-catalog'
import { getCachedProOfferCatalog } from './pro-offer-data'

const PRO_MESSAGE_NAMESPACE = 'pro'

export async function ProProductJsonLd({ locale }: { locale: string }) {
  // SEO metadata is prerendered into the shared static shell — always live.
  const [t, { offers }] = await Promise.all([
    getTranslations({ locale, namespace: PRO_MESSAGE_NAMESPACE }),
    getCachedProOfferCatalog('live', locale),
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
          offers: buildProOfferSchemaOffers(offers, (planId) =>
            t(`schema.offers.${planId}`)
          ),
        }),
      }}
    />
  )
}
