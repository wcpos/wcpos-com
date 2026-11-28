// The /support H1 names the product WCPOS; "WooCommerce POS" is never its name, with any space.
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
    it(`${locale} support.chat.hero.title names WCPOS, never WooCommerce POS`, () => {
      const title = messages.support.chat.hero.title
      expect(title).toContain('WCPOS')
      expect(title).not.toMatch(/WooCommerce[\s\u00a0]POS/)
    })
  }
})
