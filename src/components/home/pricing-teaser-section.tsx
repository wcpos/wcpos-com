import { useFormatter, useTranslations } from 'next-intl'
import { getLocale } from 'next-intl/server'
import { Check } from 'lucide-react'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'
import { cn } from '@/lib/utils'
import {
  applyProOfferCatalogCachePolicy,
  getHomeYearlyPrice,
  getProOfferCatalog,
  type ProOffer,
} from '@/lib/pro-offer-catalog'
import { getLiveStoreEnvironment } from '@/lib/store-environment'

// Only what tells the plans apart, in the labels "What the register does"
// uses (the full inventory lives there). Keys are under `home`.
const freeFeatures = [
  'story.free2.register.title',
  'pricing.free.features.f1',
  'story.free2.split.title',
  'story.free2.offline.title',
  'story.free2.coupon.title',
  'story.free2.today.title',
] as const
const proFeatures = [
  'features.items.stores.title',
  'features.items.readers.title',
  'features.items.f4.title',
  'features.items.f3.title',
  'features.items.f5.title',
  'features.items.f6.title',
  'pricing.pro.features.p7',
] as const

export function PricingTeaserSectionFallback() {
  return <PricingTeaserSectionContent offers={null} />
}

async function getCachedOffers(locale: string) {
  'use cache'

  // Prerendered into the shared static homepage shell — always live prices.
  const catalog = await getProOfferCatalog(
    undefined,
    getLiveStoreEnvironment(),
    locale
  )
  applyProOfferCatalogCachePolicy(catalog)
  return catalog.offers
}

export async function PricingTeaserSection() {
  const locale = await getLocale()
  const offers = await getCachedOffers(locale)

  return <PricingTeaserSectionContent offers={offers} />
}

function PlanList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mb-6 mt-3 flex flex-col gap-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
        >
          <Check
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-wcpos-red"
          />
          {item}
        </li>
      ))}
    </ul>
  )
}

// Both cards share the resting --border edge; the featured Pro Yearly card
// is marked by its raised radius and shadow (ADR 0009), never a brighter
// edge, which would read as hover.
const planCard = 'flex flex-col border border-border bg-background p-7'

function PricingTeaserSectionContent({
  offers,
}: {
  offers: ProOffer[] | null
}) {
  const t = useTranslations('home')
  const format = useFormatter()
  const yearly = offers ? getHomeYearlyPrice(offers) : null
  const freePrice = format.number(0, {
    style: 'currency',
    currency: yearly?.currency ?? 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  })

  return (
    <Section tone="muted" spacing="compact" className="border-t border-border">
      <SectionHeading className="mb-10" title={t('pricing.heading')} />

      <div className="mx-auto mb-8 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className={cn(planCard, 'rounded-md')}>
          <h3 className="text-lg font-semibold">{t('pricing.free.title')}</h3>
          <p className="mb-1.5 mt-2 text-4xl font-bold tracking-tight">{freePrice}</p>
          <p className="text-[13px] leading-5 text-muted-foreground md:min-h-[100px]">
            {t('pricing.free.description')}
          </p>
          <PlanList items={freeFeatures.map((key) => t(key))} />
          <Button asChild variant="outline" size="lg" className="mt-auto w-full">
            <Link href="/downloads">{t('cta.download')}</Link>
          </Button>
        </div>

        <div className={cn(planCard, 'rounded-lg shadow-lg')}>
          <h3 className="text-lg font-semibold">{t('pricing.pro.title')}</h3>
          {yearly ? (
            <p className="mb-1.5 mt-2 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight">{yearly.price}</span>
              <span className="text-sm text-muted-foreground">
                {t('pricing.pro.priceSuffix', { currency: yearly.currency })}
              </span>
            </p>
          ) : (
            <p className="mb-1.5 mt-2 text-sm text-muted-foreground">
              {t('pricing.fallback')}
            </p>
          )}
          <p className="text-[13px] leading-5 text-muted-foreground md:min-h-[100px]">
            {t('pricing.pro.note')}
          </p>
          <p className="mt-4 text-sm font-medium">{t('pricing.pro.intro')}</p>
          <PlanList items={proFeatures.map((key) => t(key))} />
          <Button asChild variant="outline" size="lg" className="mt-auto w-full">
            <TrackedLocaleLink
              href="/pro"
              eventName="click_pro_cta"
              eventProperties={{ location: 'home_pricing_teaser' }}
            >
              {t('pricing.cta')}
            </TrackedLocaleLink>
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t.rich('pricing.compareLine', {
          square: (chunks) => (
            <TextLink asChild>
              <Link href="/compare/square">{chunks}</Link>
            </TextLink>
          ),
          foosales: (chunks) => (
            <TextLink asChild>
              <Link href="/compare/foosales">{chunks}</Link>
            </TextLink>
          ),
          link: (chunks) => (
            <TextLink asChild>
              <Link href="/compare">{chunks}</Link>
            </TextLink>
          ),
        })}
      </p>
    </Section>
  )
}
