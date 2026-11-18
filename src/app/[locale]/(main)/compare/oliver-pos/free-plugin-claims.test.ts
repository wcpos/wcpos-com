import { describe, expect, it } from 'vitest'
import de from '../../../../../../messages/de.json'
import en from '../../../../../../messages/en.json'
import es from '../../../../../../messages/es.json'
import fr from '../../../../../../messages/fr.json'
import it_ from '../../../../../../messages/it.json'
import ja from '../../../../../../messages/ja.json'
import ko from '../../../../../../messages/ko.json'
import nl from '../../../../../../messages/nl.json'
import pt from '../../../../../../messages/pt.json'
import zh from '../../../../../../messages/zh.json'

const LOCALES = [
  { locale: 'en', messages: en, unlimited: 'unlimited' },
  { locale: 'de', messages: de, unlimited: 'unbegrenzt' },
  { locale: 'nl', messages: nl, unlimited: 'onbeperkt' },
  { locale: 'fr', messages: fr, unlimited: 'illimit' },
  { locale: 'es', messages: es, unlimited: 'ilimitad' },
  { locale: 'it', messages: it_, unlimited: 'illimitat' },
  { locale: 'pt', messages: pt, unlimited: 'ilimitad' },
  { locale: 'ja', messages: ja, unlimited: '無制限' },
  { locale: 'ko', messages: ko, unlimited: '무제한' },
  { locale: 'zh', messages: zh, unlimited: '无限' },
]

const KEYS = [
  {
    key: 'compare.oliver.shortAnswer.wcpos',
    get: (m: typeof en) => m.compare.oliver.shortAnswer.wcpos,
    mustContain: 'Pro',
  },
  {
    key: 'compare.oliver.faq.trial.answer',
    get: (m: typeof en) => m.compare.oliver.faq.trial.answer,
    mustContain: 'demo.wcpos.com/pos',
  },
]

const CASES = LOCALES.flatMap(({ locale, messages, unlimited }) =>
  KEYS.map(({ key, get, mustContain }) => ({
    locale,
    key,
    value: get(messages as typeof en) as unknown,
    mustContain,
    unlimited,
  })),
)

describe('/compare/oliver-pos free plugin claims', () => {
  it.each(CASES)(
    '$locale $key is a non-empty string with its anchor',
    ({ value, mustContain }) => {
      expect(typeof value).toBe('string')
      expect((value as string).length).toBeGreaterThan(0)
      expect(value as string).toContain(mustContain)
    },
  )

  it.each(CASES)(
    '$locale $key does not call the free plugin unlimited',
    ({ value, unlimited }) => {
      expect(value as string).not.toMatch(new RegExp(unlimited, 'i'))
    },
  )

  it.each(CASES.filter(({ locale }) => locale === 'en'))(
    'en $key names one register and no blanket claim',
    ({ value }) => {
      expect(value as string).not.toMatch(/unlimited|no caps on anything/i)
      expect(value as string).toContain('one register')
    },
  )
})
