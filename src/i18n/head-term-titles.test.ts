import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// de and nl /pro and /downloads titles use the same head term as the /pro H1.
type Messages = {
  pro: { metadata: { title: string }; hero: { title: string } }
  downloads: { meta: { title: string } }
}

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
}

const CASES = [
  {
    locale: 'de',
    term: 'Kassensystem',
    pro: 'Pro-Funktionen & Preise – Kassensystem für WooCommerce',
    downloads: 'WooCommerce-Kassensystem herunterladen – Mac, Windows & Web',
  },
  {
    locale: 'nl',
    term: 'Kassasysteem',
    pro: 'Pro-functies & prijzen – Kassasysteem voor WooCommerce',
    downloads: 'Kassasysteem voor WooCommerce downloaden – Mac, Windows & web',
  },
] as const

describe('head term in de and nl titles', () => {
  it.each(CASES)('$locale titles are the exact head-term strings', ({ locale, pro, downloads }) => {
    const messages = load(locale)
    expect(messages.pro.metadata.title).toBe(pro)
    expect(messages.downloads.meta.title).toBe(downloads)
  })

  it.each(CASES)('$locale /pro H1 shares the head term', ({ locale, term }) => {
    expect(load(locale).pro.hero.title).toContain(term)
  })

  it.each(CASES)('$locale titles fit in 62 characters', ({ locale }) => {
    const messages = load(locale)
    expect([...messages.pro.metadata.title].length).toBeLessThanOrEqual(62)
    expect([...messages.downloads.meta.title].length).toBeLessThanOrEqual(62)
  })
})
