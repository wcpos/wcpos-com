import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The 5,000+ figure is the wordpress.org active-installs count, so its label
// says "active installs", never "stores".
const LOCALES: Record<string, { stores: RegExp; installs: string }> = {
  en: { stores: /stores?/i, installs: 'active installs' },
  de: { stores: /Shops|Geschäfte/, installs: 'aktive Installationen' },
  nl: { stores: /winkels/, installs: 'actieve installaties' },
  fr: { stores: /boutiques/, installs: 'installations actives' },
  es: { stores: /tiendas/, installs: 'instalaciones activas' },
  it: { stores: /negozi/, installs: 'installazioni attive' },
  pt: { stores: /lojas/, installs: 'instalações ativas' },
  ja: { stores: /店舗|ストア/, installs: 'アクティブインストール' },
  ko: { stores: /매장/, installs: '활성 설치' },
  zh: { stores: /商店/, installs: '活跃安装' },
}

const KEYS = [
  'home.story.a1.badges.b1',
  'pro.buyBox.proof',
  'compare.oliver.claims.hobbyShops.response',
] as const

function load(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
}

function get(messages: Record<string, unknown>, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages)
  if (typeof value !== 'string') throw new Error(`${key} is not a string`)
  return value
}

describe('active installs label', () => {
  it('en uses the exact active-installs copy', () => {
    const en = load('en')
    expect(get(en, 'home.story.a1.badges.b1')).toBe('5,000+ Active Installs')
    expect(get(en, 'pro.buyBox.proof')).toBe('5,000+ active installs on WordPress.org')
    expect(get(en, 'compare.oliver.claims.hobbyShops.response')).toBe(
      "WCPOS has 5,000+ active installs on WordPress.org — more than six times Oliver's — with over 400,000 downloads since 2014."
    )
  })

  for (const [locale, { stores, installs }] of Object.entries(LOCALES)) {
    describe(locale, () => {
      const messages = load(locale)

      for (const key of KEYS) {
        it(`${key} says installs, not stores`, () => {
          const value = get(messages, key)
          expect(value).not.toMatch(stores)
          expect(value.toLowerCase()).toContain(installs.toLowerCase())
        })
      }

      it('pro.buyBox.proof names WordPress.org', () => {
        expect(get(messages, 'pro.buyBox.proof')).toContain('WordPress.org')
      })
    })
  }
})
