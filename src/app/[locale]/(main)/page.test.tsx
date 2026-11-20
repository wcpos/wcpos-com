import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      description: 'Translated homepage metadata description',
    }

    return messages[key] ?? key
  }),
  getMessages: vi.fn(async () => ({})),
  setRequestLocale: vi.fn(),
}))

vi.mock('next-intl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next-intl')>()),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

import Home, { generateMetadata } from './page'

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

describe('Home page SoftwareApplication JSON-LD', () => {
  it('uses the locale url and the home meta description', async () => {
    const { container } = render(
      await Home({ params: Promise.resolve({ locale: 'de' }) }),
    )

    const app = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .find((data) => data['@type'] === 'SoftwareApplication')

    expect(app.url).toBe('https://wcpos.com/de')
    expect(app.description).toBe('Translated homepage metadata description')
  })
})

describe('Home page WebSite JSON-LD', () => {
  async function websiteNodes(locale: string) {
    const { container } = render(
      await Home({ params: Promise.resolve({ locale }) }),
    )

    return Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .filter((data) => data['@type'] === 'WebSite')
  }

  it('names the site at the domain root in English', async () => {
    const sites = await websiteNodes('en')

    expect(sites).toHaveLength(1)
    expect(sites[0].name).toBe('WCPOS')
    expect(sites[0].url).toBe('https://wcpos.com/')
    expect(sites[0].inLanguage).toBe('en')
    expect(sites[0]).not.toHaveProperty('alternateName')
  })

  it('keeps the root url and states the locale in German', async () => {
    const sites = await websiteNodes('de')

    expect(sites).toHaveLength(1)
    expect(sites[0].inLanguage).toBe('de')
    expect(sites[0].url).toBe('https://wcpos.com/')
  })
})
