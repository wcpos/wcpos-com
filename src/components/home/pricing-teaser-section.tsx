import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import {
  applyProOfferCatalogCachePolicy,
  formatHomeProPriceSummary,
  getProOfferCatalog,
} from '@/lib/pro-offer-catalog'
import { getLiveStoreEnvironment } from '@/lib/store-environment'

const freeFeatures = [
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
] as const
const proFeatures = [
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
] as const

export function PricingTeaserSectionFallback() {
  return <PricingTeaserSectionContent priceSummary={null} />
}

async function getCachedPriceSummary() {
  'use cache'

  // Prerendered into the shared static homepage shell — always live prices.
  const catalog = await getProOfferCatalog(undefined, getLiveStoreEnvironment())
  applyProOfferCatalogCachePolicy(catalog)
  return formatHomeProPriceSummary(catalog.offers)
}

export async function PricingTeaserSection() {
  const priceSummary = await getCachedPriceSummary()

  return <PricingTeaserSectionContent priceSummary={priceSummary} />
}

function PricingTeaserSectionContent({
  priceSummary,
}: {
  priceSummary: string | null
}) {
  const t = useTranslations('home.pricing')
  const effectivePriceSummary = priceSummary ?? t('fallback')

  return (
    <Section tone="muted" spacing="default">
      <SectionHeading
        className="mb-10"
        title={t('heading')}
      />

      {/* Comparison */}
      <div className="mx-auto mb-8 grid max-w-3xl overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 md:grid-cols-2">
        {/* Free Column */}
        <div className="bg-slate-50 p-6 dark:bg-slate-800/50">
          <h3 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t('free.title')}
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {t('free.description')}
          </p>
          <ul className="space-y-3">
            {freeFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-wcpos-red"
                />
                {t(`free.features.${feature}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Column */}
        <div className="border-t border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 md:border-l md:border-t-0">
          <h3 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t('pro.title')}
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {effectivePriceSummary}
          </p>
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('pro.intro')}
          </p>
          <ul className="space-y-3">
            {proFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-wcpos-red"
                />
                {t(`pro.features.${feature}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Button asChild variant="brand" size="xl">
          <TrackedLocaleLink
            href="/pro"
            eventName="click_pro_cta"
            eventProperties={{ location: 'home_pricing_teaser' }}
          >
            {t('cta')}
          </TrackedLocaleLink>
        </Button>
      </div>
    </Section>
  )
}
