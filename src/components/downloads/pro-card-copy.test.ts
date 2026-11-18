import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const TERMINAL_PAYMENTS: Record<string, string> = {
  en: 'terminal payments',
  de: 'Terminalzahlungen',
  nl: 'terminalbetalingen',
  fr: 'paiements par terminal',
  es: 'pagos con terminal',
  it: 'pagamenti con terminale',
  pt: 'pagamentos em terminal',
  ja: '端末決済',
  ko: '터미널 결제',
  zh: '终端付款',
}

function readProCardBody(locale: string): string {
  const file = path.resolve(process.cwd(), 'messages', `${locale}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8')).downloads.page.steps.pro.cardBody
}

describe('downloads Pro card copy', () => {
  it('the Pro card names terminal payments, not plain payments', () => {
    for (const [locale, phrase] of Object.entries(TERMINAL_PAYMENTS)) {
      expect(readProCardBody(locale).includes(phrase), locale).toBe(true)
    }
    expect(readProCardBody('en')).not.toMatch(/^Payments\b/)
    expect(readProCardBody('en')).not.toMatch(/(^|, )Payments\b/)
  })
})
