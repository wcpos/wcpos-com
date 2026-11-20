import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type Messages = { home: { story: { a1: { k: string } } } }

function kicker(locale: string): string {
  const raw = readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
  return (JSON.parse(raw) as Messages).home.story.a1.k
}

describe('home story kicker per locale', () => {
  it('uses the German word on /de', () => {
    expect(kicker('de')).toBe('Kassensystem für WooCommerce')
  })

  it.each(['de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'])(
    'does not use the English "Point of Sale" in %s',
    (locale) => {
      expect(kicker(locale)).not.toContain('Point of Sale')
    },
  )
})
