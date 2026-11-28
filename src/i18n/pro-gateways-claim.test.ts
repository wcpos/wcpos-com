import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The /pro gateways card says what the comparison pages say: Pro turns on the
// store's other WooCommerce payment gateways at the register, naming the
// methods it covers. It must not claim that every gateway works.
const ANY_WORD: Record<string, string> = {
  en: 'any',
  de: 'jedem',
  nl: 'elke',
  fr: "n'importe quelle",
  es: 'cualquier',
  it: 'qualsiasi',
  pt: 'qualquer',
  ja: '任意',
  ko: '모든',
  zh: '任何',
}

function description(locale: string): string {
  const messages = JSON.parse(
    readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  )
  const value = messages?.pro?.features?.gateways?.description
  if (typeof value !== 'string') throw new Error(`${locale}: gateways description missing`)
  return value
}

describe('pro gateways card claim', () => {
  it('en names the methods and keeps the WooCommerce gateway scope', () => {
    expect(description('en')).toBe(
      'Turn on your store’s other payment methods at the register: bank transfer, cash on delivery, cheque, and the other WooCommerce gateways your store uses.',
    )
  })

  for (const [locale, anyWord] of Object.entries(ANY_WORD)) {
    it(`${locale} does not claim any gateway and names WooCommerce`, () => {
      const text = description(locale)
      const pattern = locale === 'en' ? /\bany\b/i : new RegExp(anyWord, 'i')
      expect(text).not.toMatch(pattern)
      expect(text).toContain('WooCommerce')
    })
  }
})
