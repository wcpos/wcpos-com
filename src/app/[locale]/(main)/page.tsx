import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { preload } from 'react-dom'
import { ScrollStory } from '@/components/home/scroll-story'
import { UseCasesSection } from '@/components/home/use-cases-section'
import { FeaturesSection } from '@/components/home/features-section'
import {
  PricingTeaserSection,
  PricingTeaserSectionFallback,
} from '@/components/home/pricing-teaser-section'
import { TrustSection } from '@/components/home/trust-section'
import { CtaSection } from '@/components/home/cta-section'
import { marketingMetadata } from '@/lib/seo'
import { clientMessages } from '@/i18n/client-messages'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home.meta' })
  return marketingMetadata({
    locale,
    path: '/',
    description: t('description'),
  })
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages()

  // The act-1 wood-counter texture is a CSS-module background image, so the
  // browser only discovers it after the stylesheet loads and the section is
  // matched — and on mobile it IS the LCP resource (the section is the LCP
  // element). Preloading (~2.5KB) moves the request into the initial document.
  // Both the mobile static variant and the desktop pinned variant use the
  // light texture; the counter photos are <img>/<picture> and discoverable on
  // their own.
  preload('/images/story/counter-wood-light.svg', {
    as: 'image',
    fetchPriority: 'high',
  })

  return (
    <NextIntlClientProvider messages={clientMessages(messages, ['home.story'])}>
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
              image: 'https://wcpos.com/icon.png',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </main>
    </NextIntlClientProvider>
  )
}
