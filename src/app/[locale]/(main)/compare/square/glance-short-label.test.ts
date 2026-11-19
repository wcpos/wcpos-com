import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// /compare/square gives the phone glance table a short "Square" label; the
// column header keeps the full product name.
const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const

function squareGlance(locale: string) {
  const messages = JSON.parse(
    readFileSync(resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
  )
  return messages.compare.square.glance
}

describe('/compare/square glance short label', () => {
  it.each(LOCALES)('%s has colSquareShort "Square" and the full colSquare', (locale) => {
    const glance = squareGlance(locale)
    expect(glance.colSquareShort).toBe('Square')
    expect(glance.colSquare).toBe('Square POS + Square for WooCommerce')
  })
})
