import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { marketingMetadata } from '@/lib/seo'
import { AboutHero } from '@/components/about/about-hero'
import {
  FounderLetter,
  FounderLetterFallback,
} from '@/components/about/founder-letter'
import { StoryTimeline } from '@/components/about/story-timeline'
import { ValuesSection } from '@/components/about/values-section'
import { AboutCta } from '@/components/about/about-cta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about.meta' })
  return marketingMetadata({
    locale,
    path: '/about-us',
    title: t('title'),
    description: t('description'),
  })
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main>
      <AboutHero />
      <Suspense fallback={<FounderLetterFallback />}>
        <FounderLetter />
      </Suspense>
      <StoryTimeline />
      <ValuesSection />
      <AboutCta />
    </main>
  )
}
