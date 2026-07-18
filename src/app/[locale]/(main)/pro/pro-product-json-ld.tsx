import { getTranslations } from 'next-intl/server'
import { buildProOfferSchemaOffers } from '@/lib/pro-offer-catalog'
import { localeUrl } from '@/lib/seo'
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
          // SoftwareApplication (not Product) is the correct type for a paid
          // plugin/licence: it carries price via `offers` without Google's
          // Merchant Listings requiring shipping/returns/GTIN fields that don't
          // apply to software. Mirrors the homepage markup in ../page.tsx.
          '@type': 'SoftwareApplication',
          name: t('schema.name'),
          description: t('schema.description'),
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Windows, macOS, Linux, iOS, Android',
          url: localeUrl(locale, '/pro'),
          image: 'https://wcpos.com/images/wcpos-pro.png',
          offers: buildProOfferSchemaOffers(offers, (planId) =>
            t(`schema.offers.${planId}`)
          ),
        }),
      }}
    />
  )
}
