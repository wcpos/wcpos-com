import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Each /compare hub card leads with its page's verdict, not a list of topics
// ending in "where X is genuinely better". Phrases come from the old cards.
const OLD_PHRASES: Record<string, string[]> = {
  en: ['genuinely better'],
  de: ['wirklich besser'],
  nl: ['echt beter'],
  fr: ['réellement meilleur'],
  es: ['realmente mejor'],
  it: ['davvero migliore'],
  pt: ['genuinamente melhor', 'realmente melhor'],
  ja: ['本当に優れている', '実際に優れている'],
  ko: ['진짜로 더 나은', '실제로 더 나은'],
  zh: ['真正更胜一筹'],
}
const CJK = new Set(['ja', 'ko', 'zh'])
const CARDS = ['oliverCard', 'woocommerceCard', 'squareCard', 'jovvieCard', 'viteposCard', 'yithCard', 'foosalesCard'] as const

const EN: Record<(typeof CARDS)[number], string> = {
  oliverCard: 'Oliver syncs your store to its cloud, and its free plan caps out at 20 products; WCPOS runs inside your WordPress site with no caps, and Pro is a one-time payment.',
  woocommerceCard: "WooCommerce's own POS is free inside its mobile app, built for tablets in ten countries, with no offline mode; WCPOS runs in any browser and as desktop and mobile apps, and keeps taking cash sales offline.",
  squareCard: "Sales made in Square's POS don't become WooCommerce orders, and their stock changes sync on a schedule (hourly by default); every WCPOS sale is a WooCommerce order.",
  jovvieCard: 'Jovvie charges a platform fee on each sale on top of its monthly plans; WCPOS charges no transaction fees, and Pro is a one-time payment.',
  viteposCard: 'Both have a free version; Vitepos adds restaurant and grocery modes, and WCPOS adds desktop apps for Windows, macOS and Linux and iOS and Android apps (beta).',
  yithCard: 'YITH Point of Sale is a yearly license with separate stock per store, but no offline mode and no card terminals; WCPOS is free, and Pro adds card terminals for a one-time payment.',
  foosalesCard: "FooSales is a yearly subscription per store, and cancelling ends access to its POS; WCPOS is free, and Pro's one-time payment keeps working after the year ends.",
}

function descriptions(locale: string): Record<string, string> {
  const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
  const hub = messages.compare.hub as Record<string, { description: string }>
  return Object.fromEntries(CARDS.map((card) => [card, hub[card].description]))
}

describe('compare hub card verdicts', () => {
  it('en cards carry the exact verdicts', () => {
    expect(descriptions('en')).toEqual(EN)
  })

  describe.each(Object.keys(OLD_PHRASES))('%s', (locale) => {
    const cards = descriptions(locale)
    const values = Object.values(cards)

    it('no card repeats the old "genuinely better" tail', () => {
      for (const phrase of OLD_PHRASES[locale]) {
        for (const value of values) expect(value).not.toContain(phrase)
      }
    })

    it('the Square card names WooCommerce and every card is distinct', () => {
      expect(cards.squareCard).toContain('WooCommerce')
      expect(new Set(values).size).toBe(CARDS.length)
    })

    it('every card fits the length limit', () => {
      const limit = CJK.has(locale) ? 120 : 220
      for (const value of values) expect(value.length).toBeLessThanOrEqual(limit)
    })
  })
})
