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

// Vipps MobilePay takes payment by QR code or push notification, not on a card
// terminal (src/lib/extensions-catalog.json), so each cell says so.
const LOCALES = [
  { locale: 'en', messages: en, vipps: 'Vipps MobilePay by QR code or push' },
  { locale: 'de', messages: de, vipps: 'Vipps MobilePay per QR-Code oder Push' },
  { locale: 'nl', messages: nl, vipps: 'Vipps MobilePay via QR-code of push' },
  { locale: 'fr', messages: fr, vipps: 'Vipps MobilePay par QR code ou notification push' },
  { locale: 'es', messages: es, vipps: 'Vipps MobilePay por código QR o notificación push' },
  { locale: 'it', messages: it_, vipps: 'Vipps MobilePay tramite codice QR o notifica push' },
  { locale: 'pt', messages: pt, vipps: 'Vipps MobilePay por código QR ou notificação push' },
  { locale: 'ja', messages: ja, vipps: 'QRコードまたはプッシュ通知のVipps MobilePay' },
  { locale: 'ko', messages: ko, vipps: 'QR 코드 또는 푸시 알림 방식의 Vipps MobilePay' },
  { locale: 'zh', messages: zh, vipps: '通过二维码或推送通知收款的 Vipps MobilePay' },
] as { locale: string; messages: Messages; vipps: string }[]

const CELLS: { key: string; value: (m: Messages) => string }[] = [
  {
    key: 'compare.oliver.glance.rows.terminals.wcpos',
    value: (m) => m.compare.oliver.glance.rows.terminals.wcpos,
  },
  ...(['woocommerce', 'square', 'jovvie', 'vitepos', 'yith', 'foosales'] as const).map(
    (page) => ({
      key: `compare.${page}.glance.rows.cardPayments.wcpos`,
      value: (m: Messages) => m.compare[page].glance.rows.cardPayments.wcpos,
    }),
  ),
]

describe('compare glance terminal cells', () => {
  for (const { locale, messages, vipps } of LOCALES) {
    for (const cell of CELLS) {
      it(`${locale} ${cell.key} lists the catalogue terminals and Vipps by QR or push`, () => {
        const value = cell.value(messages)
        for (const terminal of ['Mercado Pago', 'PayArc', 'Windcave']) {
          expect(value).toContain(terminal)
        }
        expect(value).toContain(vipps)
      })
    }
  }
})

const PROSE: { key: string; value: (m: Messages) => string }[] = (
  ['square', 'woocommerce'] as const
).map((page) => ({
  key: `compare.${page}.payments.wcpos`,
  value: (m: Messages) => m.compare[page].payments.wcpos,
}))

describe('compare payments prose', () => {
  for (const { locale, messages, vipps } of LOCALES) {
    for (const prose of PROSE) {
      it(`${locale} ${prose.key} names the same terminals as the glance cell`, () => {
        const value = prose.value(messages)
        for (const terminal of ['Mercado Pago', 'PayArc', 'Windcave']) {
          expect(value).toContain(terminal)
        }
        expect(value).toContain(vipps)
      })
    }
  }
})
