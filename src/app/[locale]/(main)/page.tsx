import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ScrollStory } from '@/components/home/scroll-story'
import { UseCasesSection } from '@/components/home/use-cases-section'
import { FeaturesSection } from '@/components/home/features-section'
import {
  PricingTeaserSection,
  PricingTeaserSectionFallback,
} from '@/components/home/pricing-teaser-section'
import { TrustSection } from '@/components/home/trust-section'
import { CtaSection } from '@/components/home/cta-section'

export const metadata: Metadata = {
  description:
    'Point of Sale for WooCommerce. Sync your products, sell offline, and connect real hardware with native apps for iOS, Android, and desktop.',
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main>
      <ScrollStory />
      <UseCasesSection />
      <FeaturesSection />
      <Suspense fallback={<PricingTeaserSectionFallback />}>
        <PricingTeaserSection />
      </Suspense>
      <TrustSection />
      <CtaSection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'WCPOS',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Windows, macOS, Linux, iOS, Android',
            url: 'https://wcpos.com',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
    </main>
  )
}
