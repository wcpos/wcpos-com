import { describe, expect, it } from 'vitest'
import de from '../../../../messages/de.json'
import en from '../../../../messages/en.json'
import es from '../../../../messages/es.json'
import fr from '../../../../messages/fr.json'
import it_ from '../../../../messages/it.json'
import ja from '../../../../messages/ja.json'
import ko from '../../../../messages/ko.json'
import nl from '../../../../messages/nl.json'
import pt from '../../../../messages/pt.json'
import zh from '../../../../messages/zh.json'

type Messages = typeof en

const LOCALES: { locale: string; messages: Messages; limit: number }[] = [
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

const KEYS = {
  'home.meta.description': (m: Messages) => m.home.meta.description as unknown,
  'downloads.meta.description': (m: Messages) =>
    m.downloads.meta.description as unknown,
  'pro.metadata.description': (m: Messages) =>
    m.pro.metadata.description as unknown,
} as const

const CASES = LOCALES.flatMap(({ locale, messages, limit }) =>
  Object.entries(KEYS).map(([key, get]) => ({
    locale,
    key,
    limit,
    description: get(messages),
  }))
)

describe('home and /downloads meta descriptions', () => {
  it.each(CASES)(
    '$locale $key fits in $limit characters',
    ({ description, limit }) => {
      expect(typeof description).toBe('string')
      const length = [...(description as string)].length
      expect(length).toBeGreaterThan(0)
      expect(length).toBeLessThanOrEqual(limit)
    }
  )

  it.each(LOCALES)(
    '$locale downloads.meta.description names iOS',
    ({ messages }) => {
      expect(messages.downloads.meta.description).toContain('iOS')
    }
  )

  it.each(LOCALES)(
    '$locale pro.metadata.description names WooCommerce',
    ({ messages }) => {
      expect(messages.pro.metadata.description).toContain('WooCommerce')
    }
  )

  it.each([
    'home.meta.description',
    'downloads.meta.description',
  ] as const)('en %s says beta', (key) => {
    const description = KEYS[key](en) as string
    expect(description).toContain('beta')
  })
})
