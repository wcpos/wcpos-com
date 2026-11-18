import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FIRST_ITEM: Record<string, string> = {
  en: 'Terminal payments',
  de: 'Terminalzahlungen',
  nl: 'Terminalbetalingen',
  fr: 'Paiements par terminal',
  es: 'Pagos con terminal',
  it: 'Pagamenti con terminale',
  pt: 'Pagamentos em terminal',
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
    for (const [locale, firstItem] of Object.entries(FIRST_ITEM)) {
      expect(readProCardBody(locale).startsWith(firstItem), locale).toBe(true)
    }
    expect(readProCardBody('en')).not.toMatch(/^Payments\b/)
  })
})
