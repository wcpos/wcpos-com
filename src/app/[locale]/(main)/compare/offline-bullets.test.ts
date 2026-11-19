import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// The /compare offline bullets say WCPOS records card sales taken on the
// merchant's own standalone terminal offline, and the home hero subline names
// tablet, phone and computer instead of "the tablet".
const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const
type Locale = (typeof LOCALES)[number]

const OFFLINE_KEYS = [
  ['square', 'squareBetter'],
  ['vitepos', 'viteposBetter'],
  ['foosales', 'foosalesBetter'],
] as const

// The start of the WCPOS sentence these bullets had before (cash yes, cards no).
const OLD_WCPOS_SENTENCE: Record<Locale, string> = {
  en: 'WCPOS keeps taking cash sales offline, but connected card readers ',
  de: 'WCPOS wickelt offline weiterhin Barverkäufe ab, aber angebundene Kartenleser ',
  nl: 'WCPOS blijft offline contante verkopen afhandelen, maar aangesloten kaartlezers ',
  fr: 'WCPOS continue de réaliser des ventes en espèces hors ligne, mais les lecteurs de carte connectés ',
  es: 'WCPOS sigue realizando ventas en efectivo sin conexión, pero los lectores de tarjetas conectados ',
  it: 'WCPOS continua a effettuare vendite in contanti offline, ma i lettori di carte collegati ',
  pt: 'O WCPOS continua a realizar vendas em dinheiro offline, mas os leitores de cartão ligados ao POS ',
  ja: 'WCPOSはオフラインでも現金販売を続けられますが、接続型のカードリーダー',
  ko: 'WCPOS는 오프라인에서도 현금 판매를 계속할 수 있지만, 연결된 카드 리더기',
  zh: 'WCPOS 在离线时仍可继续现金销售，但连接的读卡器',
}

// The competitor sentence each en bullet keeps before its WCPOS sentence.
const EN_PREFIXES = [
  "Offline card payments: Square's POS keeps taking cards without internet, as long as you reconnect and upload them within 72 hours, and you are responsible for any that expire, are declined, or are disputed. ",
  'Offline orders — Vitepos says it keeps processing orders without an internet connection and syncs them when the connection returns. ',
  'Offline orders — FooSales says its apps keep recording new orders, cancellations and refunds without an internet connection and sync them to WooCommerce when the connection returns. ',
]

const BEFORE: Record<Locale, string> = {
  en: 'WCPOS turns the tablet into your register — same catalog, same stock, same prices, even offline.',
  de: 'WCPOS macht dein Tablet zur Kasse — derselbe Katalog, derselbe Bestand, dieselben Preise, sogar offline.',
  nl: 'WCPOS verandert de tablet in je kassa — dezelfde catalogus, dezelfde voorraad, dezelfde prijzen, zelfs offline.',
  fr: 'WCPOS transforme la tablette en caisse — même catalogue, même stock, mêmes prix, même hors ligne.',
  es: 'WCPOS convierte la tableta en tu caja: el mismo catálogo, el mismo stock, los mismos precios, incluso sin conexión.',
  it: 'WCPOS trasforma il tablet nel tuo registratore — stesso catalogo, stesso stock, stessi prezzi, anche offline.',
  pt: 'O WCPOS transforma o tablet na sua caixa — o mesmo catálogo, o mesmo stock, os mesmos preços, mesmo offline.',
  ja: 'WCPOSはタブレットをレジに変えます。同じカタログ、同じ在庫、同じ価格を、オフラインでも利用できます。',
  ko: 'WCPOS는 태블릿을 계산대로 바꿉니다 — 같은 카탈로그, 같은 재고, 같은 가격, 오프라인에서도 그대로입니다.',
  zh: 'WCPOS 将平板变成你的收银机——同一个商品目录、同样的库存、同样的价格，即使离线也能使用。',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function messages(locale: Locale): any {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
}

function offlineBullets(locale: Locale): string[] {
  const compare = messages(locale).compare
  return OFFLINE_KEYS.map(([page, block]) => compare[page][block].offline as string)
}

describe('/compare offline bullets', () => {
  it.each(LOCALES)('%s replaces the old WCPOS sentence and keeps WCPOS', (locale) => {
    for (const bullet of offlineBullets(locale)) {
      expect(bullet).not.toContain(OLD_WCPOS_SENTENCE[locale])
      expect(bullet).toContain('WCPOS')
    }
  })

  it('en keeps each competitor sentence and ends with the new WCPOS sentence', () => {
    offlineBullets('en').forEach((bullet, i) => {
      expect(bullet.startsWith(EN_PREFIXES[i])).toBe(true)
      expect(bullet).toContain('standalone terminal')
      expect(bullet.endsWith('connected readers and online gateways need a connection.')).toBe(true)
    })
  })
})

describe('home hero subline', () => {
  it('en names tablet, phone or computer', () => {
    const subline = messages('en').home.story.a1.b as string
    expect(subline).toContain('tablet, phone or computer')
    expect(subline).not.toContain('the tablet')
  })

  it.each(LOCALES)('%s differs from its previous value', (locale) => {
    expect(messages(locale).home.story.a1.b).not.toBe(BEFORE[locale])
  })
})
