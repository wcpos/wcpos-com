import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// /compare/square's meta description gives the answer (Square POS sales never
// become WooCommerce orders; every WCPOS sale does), not a list of topics.
const LATIN = ['de', 'nl', 'fr', 'es', 'it', 'pt'] as const
const CJK = ['ja', 'ko', 'zh'] as const
const LOCALES = ['en', ...LATIN, ...CJK] as const

// Each locale's old topic-list opening (its first four words, from git).
// ja has no spaces, so its opening is cut at the first clause.
const OLD_OPENINGS: Record<(typeof LOCALES)[number], string> = {
  en: 'When Square for WooCommerce',
  de: 'Wann Square for WooCommerce',
  nl: 'Wanneer Square for WooCommerce',
  fr: 'Quand Square for WooCommerce',
  es: 'Cuándo Square for WooCommerce',
  it: 'Quando Square for WooCommerce',
  pt: 'Quando o Square for',
  ja: 'Square for WooCommerceが適している',
  ko: 'Square for WooCommerce가 더',
  zh: '何时 Square for WooCommerce',
}

function description(locale: string): string {
  const messages = JSON.parse(
    readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  )
  return messages.compare.square.metadata.description
}

describe('compare.square.metadata.description', () => {
  it('en is the answer, not a topic list', () => {
    expect(description('en')).toBe(
      "Square for WooCommerce syncs products and stock, but sales in Square's POS never become WooCommerce orders. Every WCPOS sale does. By the maker of WCPOS.",
    )
  })

  it.each(LOCALES)('%s names Square, WooCommerce and WCPOS and drops the old opening', (locale) => {
    const text = description(locale)
    expect(text).toContain('Square')
    expect(text).toContain('WooCommerce')
    expect(text).toContain('WCPOS')
    expect(text).not.toContain(OLD_OPENINGS[locale])
  })

  it('en fits in 155 characters', () => {
    expect([...description('en')].length).toBeLessThanOrEqual(155)
  })

  it.each(LATIN)('%s fits in 160 characters', (locale) => {
    expect([...description(locale)].length).toBeLessThanOrEqual(160)
  })

  it.each(CJK)('%s fits in 100 characters', (locale) => {
    expect([...description(locale)].length).toBeLessThanOrEqual(100)
  })
})
