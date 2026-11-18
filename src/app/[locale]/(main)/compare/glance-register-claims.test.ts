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

// One short marker per locale, copied from that locale's
// compare.oliver.freeTier.rows.devices.wcpos.
const ONE_REGISTER = [
  { locale: 'en', messages: en, marker: 'one register' },
  { locale: 'de', messages: de, marker: 'eine Kasse' },
  { locale: 'nl', messages: nl, marker: 'één kassa' },
  { locale: 'fr', messages: fr, marker: 'une caisse' },
  { locale: 'es', messages: es, marker: 'una caja' },
  { locale: 'it', messages: it_, marker: 'una cassa' },
  { locale: 'pt', messages: pt, marker: 'uma caixa' },
  { locale: 'ja', messages: ja, marker: 'レジ1台' },
  { locale: 'ko', messages: ko, marker: '계산대 1대' },
  { locale: 'zh', messages: zh, marker: '一个收银台' },
] as { locale: string; messages: Messages; marker: string }[]

function glanceWcposCells(messages: Messages) {
  const cells: { key: string; row: string; value: string }[] = []
  for (const [page, section] of Object.entries(messages.compare)) {
    const rows = (section as { glance?: { rows?: Record<string, unknown> } })
      .glance?.rows
    if (!rows) continue
    for (const [row, cell] of Object.entries(rows)) {
      const value = (cell as { wcpos?: unknown })?.wcpos
      if (typeof value === 'string') {
        cells.push({ key: `compare.${page}.glance.rows.${row}.wcpos`, row, value })
      }
    }
  }
  return cells
}

describe('glance register claims', () => {
  it('en: every glance cell claiming unlimited devices also says one register', () => {
    const cells = glanceWcposCells(en)
    expect(cells.length).toBeGreaterThan(0)
    for (const { key, row, value } of cells) {
      if (row === 'license') continue
      if (/unlimited devices/i.test(value)) {
        expect(value, key).toMatch(/one register/i)
      }
    }
  })

  it.each(ONE_REGISTER)('$locale: device cells name the free register limit', ({ locale, messages, marker }) => {
    const c = messages.compare
    const values = {
      'compare.oliver.freeTier.rows.devices.wcpos': c.oliver.freeTier.rows.devices.wcpos,
      'compare.square.glance.rows.devices.wcpos': c.square.glance.rows.devices.wcpos,
      'compare.woocommerce.glance.rows.devices.wcpos': c.woocommerce.glance.rows.devices.wcpos,
      'compare.foosales.glance.rows.devices.wcpos': c.foosales.glance.rows.devices.wcpos,
    }
    for (const [key, value] of Object.entries(values)) {
      expect(value.toLowerCase(), `${locale} ${key}`).toContain(marker.toLowerCase())
    }
  })
})
