import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// No /compare page promises a re-check schedule: nothing in the repo enforces
// one, and the promise goes false as soon as a page's facts age past it. Each
// page shows the date its facts were last checked instead.
// (metadata-length.test.ts keeps "WooCommerce POS" out of the disclosure in
// every locale.)
const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const

// "Quarter" in each locale's wording: quarter(s/ly) as a whole word (not
// "headquartered") / Quartal, vierteljährlich / trimestre, trimestral(mente) /
// kwartaal / 四半期 / 분기 / 季度.
const QUARTERLY = /\bquarter(?:s|ly)?\b|quartal|vierteljährlich|trimestr|kwartaal|四半期|분기|季度/i

function compare(locale: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  ).compare
}

function stringsWithKeys(value: unknown, key = 'compare'): [string, string][] {
  if (typeof value === 'string') return [[key, value]]
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => stringsWithKeys(v, `${key}.${k}`))
  }
  return []
}

describe('compare disclosure and method copy', () => {
  it('en disclosure says WCPOS publishes it and is not neutral', () => {
    expect(compare('en').disclosure.body).toBe(
      "This page is published by WCPOS, so we are not neutral. That is why every number is sourced and dated, we link to competitors' own pricing pages, and we say plainly when a competitor is the better choice. Check everything.",
    )
  })

  it('en method points at each page’s own checked date', () => {
    expect(compare('en').hub.method.body).toContain(
      'fetched on a stated date; each page shows when its facts were last checked.',
    )
  })

  it('en limits outros point at the page’s checked date', () => {
    const en = compare('en')
    expect(en.woocommerce.limits.outro).toContain(
      'the foot of this page shows when it was last checked.',
    )
    expect(en.square.limits.outro).toBe(
      'The foot of this page shows when this list was last checked.',
    )
  })

  it.each(LOCALES)('%s: no compare page promises a quarterly re-check', (locale) => {
    const promises = stringsWithKeys(compare(locale))
      .filter(([, text]) => QUARTERLY.test(text))
      .map(([key]) => key)
    expect(promises).toEqual([])
  })
})
