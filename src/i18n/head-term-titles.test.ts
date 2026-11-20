import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// de and nl /pro titles use the same head term as the /pro H1.
type Messages = {
  pro: { metadata: { title: string }; hero: { title: string } }
}

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
}

const CASES = [
  {
    locale: 'de',
    term: 'Kassensystem',
    pro: 'Pro-Funktionen & Preise – WooCommerce-Kassensystem',
  },
  {
    locale: 'nl',
    term: 'Kassasysteem',
    pro: 'Pro-functies & prijs – Kassasysteem voor WooCommerce',
  },
] as const

describe('head term in de and nl /pro titles', () => {
  it.each(CASES)('$locale /pro title is the exact head-term string', ({ locale, pro }) => {
    expect(load(locale).pro.metadata.title).toBe(pro)
  })

  it.each(CASES)('$locale /pro H1 shares the head term', ({ locale, term }) => {
    expect(load(locale).pro.hero.title).toContain(term)
  })

  it.each(CASES)('$locale /pro title renders in 60 characters with the brand', ({ locale }) => {
    const rendered = `${load(locale).pro.metadata.title} | WCPOS`
    expect([...rendered].length).toBeLessThanOrEqual(60)
  })
})
