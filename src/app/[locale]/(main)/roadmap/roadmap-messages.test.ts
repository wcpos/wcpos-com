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

type Messages = typeof en

// /roadmap is in the header nav of every page, so its title and H1 carry the
// same head term as that locale's changelog title. The layout appends
// " | WCPOS" to meta.title, hence the shorter title limits.
const LOCALES = [
  { locale: 'en', messages: en, head: 'WooCommerce POS', old: 'Roadmap', title: 52, description: 155 },
  { locale: 'de', messages: de, head: 'WooCommerce-Kassensystem', old: 'Produktplanung', title: 52, description: 160 },
  { locale: 'nl', messages: nl, head: 'Kassasysteem voor WooCommerce', old: 'Routekaart', title: 52, description: 160 },
  { locale: 'fr', messages: fr, head: 'Point de vente WooCommerce', old: 'Feuille de route', title: 52, description: 160 },
  { locale: 'es', messages: es, head: 'Punto de venta para WooCommerce', old: 'Hoja de ruta', title: 52, description: 160 },
  { locale: 'it', messages: it_, head: 'Punto vendita per WooCommerce', old: 'Piano di sviluppo', title: 52, description: 160 },
  { locale: 'pt', messages: pt, head: 'Ponto de venda para WooCommerce', old: 'Roteiro', title: 52, description: 160 },
  { locale: 'ja', messages: ja, head: 'WooCommerce用POS', old: 'ロードマップ', title: 30, description: 100 },
  { locale: 'ko', messages: ko, head: 'WooCommerce용 POS', old: '로드맵', title: 30, description: 100 },
  { locale: 'zh', messages: zh, head: 'WooCommerce 销售点系统', old: '路线图', title: 30, description: 100 },
] as {
  locale: string
  messages: Messages
  head: string
  old: string
  title: number
  description: number
}[]

const length = (value: string) => [...value].length

describe('roadmap messages', () => {
  it('en title and H1 name WooCommerce POS', () => {
    expect(en.roadmap.meta.title).toBe("WooCommerce POS Roadmap: What's Next")
    expect(en.roadmap.page.title).toBe('WooCommerce POS Roadmap')
  })

  describe.each(LOCALES)('$locale', ({ messages, head, old, title, description }) => {
    const { meta, page } = messages.roadmap

    it('title and H1 contain the head term', () => {
      // Mid-sentence H1s lower-case the head term (nl "het kassasysteem voor WooCommerce").
      expect(meta.title.toLowerCase()).toContain(head.toLowerCase())
      expect(page.title.toLowerCase()).toContain(head.toLowerCase())
    })

    it('title and description fit the search result limits', () => {
      expect(length(meta.title)).toBeLessThanOrEqual(title)
      expect(length(meta.description)).toBeLessThanOrEqual(description)
    })

    it('title is no longer the bare roadmap word', () => {
      expect(meta.title).not.toBe(old)
    })
  })
})
