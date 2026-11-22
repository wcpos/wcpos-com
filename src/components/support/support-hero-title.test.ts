// The /support H1 is text-balanced at md:text-5xl inside max-w-2xl; a no-break space keeps the product name on one line.
import { describe, expect, it } from 'vitest'
import de from '../../../messages/de.json'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'
import fr from '../../../messages/fr.json'
import it_ from '../../../messages/it.json'
import ja from '../../../messages/ja.json'
import ko from '../../../messages/ko.json'
import nl from '../../../messages/nl.json'
import pt from '../../../messages/pt.json'
import zh from '../../../messages/zh.json'

const locales = { en, de, nl, fr, es, it: it_, pt, ja, ko, zh }

describe('support.chat.hero.title', () => {
  for (const [locale, messages] of Object.entries(locales)) {
    it(`${locale} support.chat.hero.title keeps WooCommerce POS together`, () => {
      const title = messages.support.chat.hero.title
      expect(title).toContain('WooCommerce\u00a0POS')
      expect(title).not.toContain('WooCommerce POS')
    })
  }
})
