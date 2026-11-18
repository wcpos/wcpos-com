import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => `translated:${key}`),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(async () => ({ offers: [], source: 'fallback' })),
  applyProOfferCatalogCachePolicy: vi.fn(),
  buildProOfferSchemaOffers: vi.fn(() => []),
}))

import { ProProductJsonLd } from './pro-product-json-ld'

const FAQ_KEYS_IN_PAGE_ORDER = [
  'freePlugin',
  'yearlyVsLifetime',
  'expiry',
  'siteLimits',
  'paymentMethods',
]

describe('ProProductJsonLd', () => {
  it('emits the SoftwareApplication and a separate FAQPage script', async () => {
    render(await ProProductJsonLd({ locale: 'en' }))

    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    )
    expect(scripts).toHaveLength(2)
    const [softwareApplication, faqPage] = Array.from(scripts, (script) =>
      JSON.parse(script.textContent ?? 'null')
    )

    expect(Array.isArray(softwareApplication)).toBe(false)
    expect(softwareApplication['@type']).toBe('SoftwareApplication')
    expect(softwareApplication.url).toBe('https://wcpos.com/pro')

    expect(faqPage['@context']).toBe('https://schema.org')
    expect(faqPage['@type']).toBe('FAQPage')
    expect(faqPage.mainEntity).toHaveLength(5)
    expect(
      faqPage.mainEntity.map((q: { '@type': string }) => q['@type'])
    ).toEqual(Array(5).fill('Question'))
    expect(faqPage.mainEntity.map((q: { name: string }) => q.name)).toEqual(
      FAQ_KEYS_IN_PAGE_ORDER.map((key) => `translated:faq.${key}.question`)
    )
    for (const question of faqPage.mainEntity) {
      expect(question.acceptedAnswer['@type']).toBe('Answer')
      expect(typeof question.acceptedAnswer.text).toBe('string')
      expect(question.acceptedAnswer.text).not.toBe('')
    }
  })
})
