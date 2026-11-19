import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// The "At a glance" Card payments cell for WCPOS says what the free plugin
// takes (cash, and card sales from the merchant's own standalone terminal)
// before the list of Pro terminal integrations.
const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const
type Locale = (typeof LOCALES)[number]

const PAGES = ['woocommerce', 'square', 'jovvie', 'vitepos', 'yith', 'foosales'] as const

// The start of each locale's Pro terminal list, which used to open the cell.
const PRO_LIST: Record<Locale, string> = {
  en: 'Pro terminal integrations: ',
  de: 'Pro-Terminal-Integrationen: ',
  nl: 'Pro-terminalintegraties: ',
  fr: 'Intégrations de terminaux Pro : ',
  es: 'Integraciones de terminales Pro: ',
  it: 'Integrazioni con terminali Pro: ',
  pt: 'Integrações de terminais Pro: ',
  ja: 'Proの端末連携：',
  ko: 'Pro 단말기 연동: ',
  zh: 'Pro 版终端集成：',
}

const PREFIX: Partial<Record<Locale, string>> = {
  en: 'Free: cash, and card sales taken on your own standalone terminal, recorded on the order. ',
  de: 'Kostenlos: Barverkäufe sowie Kartenverkäufe über Ihr eigenes separates Zahlungsterminal, erfasst in der Bestellung. ',
  nl: 'Gratis: contante verkopen en kaartverkopen via je eigen losse betaalterminal, geregistreerd bij de bestelling. ',
}

const EN =
  'Free: cash, and card sales taken on your own standalone terminal, recorded on the order. Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Mercado Pago, PayArc, Windcave; Vipps MobilePay by QR code or push'

function cells(locale: Locale): string[] {
  const compare = JSON.parse(
    readFileSync(resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  ).compare
  return PAGES.map((page) => compare[page].glance.rows.cardPayments.wcpos as string)
}

describe('compare glance Card payments cell for WCPOS', () => {
  for (const locale of LOCALES) {
    it(`${locale}: the six cells match and name the free option before the Pro list`, () => {
      const values = cells(locale)
      for (const value of values) {
        expect(value).toBe(values[0])
        expect(value).toContain('Stripe Terminal')
        expect(value).toContain('Windcave')
        expect(value.startsWith(PRO_LIST[locale])).toBe(false)
        const proStart = value.indexOf(PRO_LIST[locale])
        expect(proStart).toBeGreaterThan(0)
        expect(value.slice(0, proStart).trim()).not.toBe('')
        const prefix = PREFIX[locale]
        if (prefix) expect(value.startsWith(prefix)).toBe(true)
      }
    })
  }

  it('en reads exactly as approved', () => {
    for (const value of cells('en')) expect(value).toBe(EN)
  })
})
