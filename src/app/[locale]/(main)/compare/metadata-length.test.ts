import { describe, expect, it } from 'vitest'
import de from '../../../../../messages/de.json'
import en from '../../../../../messages/en.json'
import es from '../../../../../messages/es.json'
import fr from '../../../../../messages/fr.json'
import it_ from '../../../../../messages/it.json'
import ja from '../../../../../messages/ja.json'
import ko from '../../../../../messages/ko.json'
import nl from '../../../../../messages/nl.json'
import pt from '../../../../../messages/pt.json'
import zh from '../../../../../messages/zh.json'

const PAGES = [
  'oliver',
  'woocommerce',
  'square',
  'jovvie',
  'vitepos',
  'yith',
  'foosales',
] as const

const LOCALES = [
  { locale: 'en', messages: en, limit: 155 },
  { locale: 'de', messages: de, limit: 160 },
  { locale: 'nl', messages: nl, limit: 160 },
  { locale: 'fr', messages: fr, limit: 160 },
  { locale: 'es', messages: es, limit: 160 },
  { locale: 'it', messages: it_, limit: 160 },
  { locale: 'pt', messages: pt, limit: 160 },
  { locale: 'ja', messages: ja, limit: 100 },
  { locale: 'ko', messages: ko, limit: 100 },
  { locale: 'zh', messages: zh, limit: 100 },
]

const CASES = LOCALES.flatMap(({ locale, messages, limit }) =>
  PAGES.map((page) => ({
    locale,
    page,
    limit,
    description: messages.compare[page].metadata.description as unknown,
  }))
)

describe('/compare detail page meta descriptions', () => {
  it.each(CASES)(
    '$locale/$page fits in $limit characters',
    ({ description, limit }) => {
      expect(typeof description).toBe('string')
      const text = description as string
      expect(text.length).toBeGreaterThan(0)
      expect(text.length).toBeLessThanOrEqual(limit)
    }
  )
})

const CJK_LOCALES = ['ja', 'ko', 'zh']

const TITLE_CASES = LOCALES.flatMap(({ locale, messages }) =>
  PAGES.map((page) => ({
    locale,
    page,
    titleLimit: CJK_LOCALES.includes(locale) ? 40 : 60,
    title: messages.compare[page].metadata.title as unknown,
  }))
)

describe('/compare detail page titles', () => {
  it.each(TITLE_CASES)(
    '$locale/$page ends at the year, has no suffix and fits in $titleLimit characters',
    ({ title, titleLimit }) => {
      expect(typeof title).toBe('string')
      const text = title as string
      expect(text).toMatch(/(\(2026\)|（2026）|（2026年）)$/)
      expect(text).not.toContain('| WCPOS')
      expect([...text].length).toBeLessThanOrEqual(titleLimit)
    }
  )

  it.each(PAGES)('en/%s names WooCommerce', (page) => {
    expect(en.compare[page].metadata.title).toContain('WooCommerce')
  })
})

describe('/compare disclosure attribution', () => {
  it.each(LOCALES)('$locale names WCPOS and no handle', ({ messages }) => {
    const body = messages.compare.disclosure.body
    expect(body).not.toMatch(/kilbot/i)
    expect(body).toContain('WCPOS')
    expect(body).toContain('WooCommerce POS')
  })
})
