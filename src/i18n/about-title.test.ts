import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// /about-us is the trust page: its <title> says what WCPOS is, not just "About".
const LATIN = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt'] as const
const CJK = ['ja', 'ko', 'zh'] as const
const LOCALES = [...LATIN, ...CJK]

type Messages = {
  footer: { about: string }
  about: { meta: { title: string } }
}

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
}

describe('about.meta.title', () => {
  it('en is the descriptive title', () => {
    expect(load('en').about.meta.title).toBe('About Us: An Independent WooCommerce Point of Sale Since 2014')
  })

  it.each(LOCALES)('%s names WooCommerce and 2014 and is more than the About label', (locale) => {
    const messages = load(locale)
    const title = messages.about.meta.title
    expect(title).toContain('WooCommerce')
    expect(title).toContain('2014')
    expect(title).not.toBe(messages.footer.about)
    expect([...title].length).toBeGreaterThan(12)
  })

  it.each(LATIN)('%s fits in 62 characters before " | WCPOS"', (locale) => {
    expect([...load(locale).about.meta.title].length).toBeLessThanOrEqual(62)
  })

  it.each(CJK)('%s fits in 32 characters before " | WCPOS"', (locale) => {
    expect([...load(locale).about.meta.title].length).toBeLessThanOrEqual(32)
  })
})
