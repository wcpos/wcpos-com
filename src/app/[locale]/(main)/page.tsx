import { NextIntlClientProvider } from 'next-intl'
import { resolveLocale } from '@/i18n/resolve-locale'
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
import { SITE_URL, localeUrl, marketingMetadata } from '@/lib/seo'
import { wcposSoftwareApplication } from '@/lib/software-application-json-ld'
import { clientMessages } from '@/i18n/client-messages'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
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
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const messages = await getMessages()
  const metaT = await getTranslations({ locale, namespace: 'home.meta' })

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
            __html: JSON.stringify(wcposSoftwareApplication({
              url: localeUrl(locale, '/'),
              description: metaT('description'),
            })),
          }}
        />
        {/* No alternateName: the front desk holds the naming variants. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'WCPOS',
              url: `${SITE_URL}/`,
              inLanguage: locale,
            }),
          }}
        />
      </main>
    </NextIntlClientProvider>
  )
}
