import { describe, expect, it } from 'vitest'
import enMessages from '../../messages/en.json'
import {
  COMPARE_FACTS_VERIFIED,
  comparePageJsonLd,
  type CompareSlug,
} from './compare-page-json-ld'

const compare = enMessages.compare

const FOOTERS: Record<CompareSlug, string> = {
  'oliver-pos': compare.oliver.footer.factsVerified,
  'woocommerce-pos': compare.woocommerce.footer.factsDated,
  square: compare.square.footer.factsDated,
  jovvie: compare.jovvie.footer.factsDated,
  vitepos: compare.vitepos.footer.factsDated,
  'yith-pos': compare.yith.footer.factsDated,
  foosales: compare.foosales.footer.factsDated,
}

const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

describe('comparePageJsonLd', () => {
  it('returns a WebPage node dated by the facts-verified date', () => {
    expect(
      comparePageJsonLd({
        slug: 'square',
        locale: 'de',
        name: 'Name',
        description: 'Description',
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: 'https://wcpos.com/de/compare/square',
      name: 'Name',
      description: 'Description',
      inLanguage: 'de',
      dateModified: '2026-10-06',
      publisher: {
        '@type': 'Organization',
        name: 'WCPOS',
        url: 'https://wcpos.com',
      },
    })
  })

  it.each(Object.entries(COMPARE_FACTS_VERIFIED))(
    'dates %s as its English footer does',
    (slug, date) => {
      const footer = FOOTERS[slug as CompareSlug]
      const long = longDate.format(new Date(`${date}T00:00:00Z`))
      expect(footer.includes(date) || footer.includes(long)).toBe(true)
    }
  )
})
