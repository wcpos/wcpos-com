import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      description: 'Translated homepage metadata description',
    }

    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/components/home/scroll-story', () => ({
  ScrollStory: () => null,
}))

vi.mock('@/components/home/use-cases-section', () => ({
  UseCasesSection: () => null,
}))

vi.mock('@/components/home/features-section', () => ({
  FeaturesSection: () => null,
}))

vi.mock('@/components/home/pricing-teaser-section', () => ({
  PricingTeaserSection: () => null,
  PricingTeaserSectionFallback: () => null,
}))

vi.mock('@/components/home/trust-section', () => ({
  TrustSection: () => null,
}))

vi.mock('@/components/home/cta-section', () => ({
  CtaSection: () => null,
}))

import { generateMetadata } from './page'

describe('Home page metadata', () => {
  it('uses translated copy with canonical and hreflang alternates', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(metadata.description).toBe('Translated homepage metadata description')
    expect(metadata.alternates?.canonical).toBe('https://wcpos.com/fr')
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://wcpos.com',
      fr: 'https://wcpos.com/fr',
      'x-default': 'https://wcpos.com',
    })
  })
})
