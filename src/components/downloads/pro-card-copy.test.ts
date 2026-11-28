import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt', 'zh']

function readProCardBody(locale: string): string {
  const file = path.resolve(process.cwd(), 'messages', `${locale}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8')).downloads.page.steps.pro.cardBody
}

describe('downloads Pro rail copy', () => {
  it('states what Free runs and what Pro adds, per the docs tier statement', () => {
    const en = readProCardBody('en')
    expect(en).toMatch(/^Free runs one register that every device shares\./)
    for (const part of ['more registers and stores', 'refunds', 'card readers', 'customer-facing display']) {
      expect(en).toContain(part)
    }
    for (const locale of LOCALES) {
      const body = readProCardBody(locale)
      expect(body, locale).toContain('WCPOS Pro')
      expect(body, locale).not.toMatch(/lifetime|risk-free|money-back/i)
    }
  })
})
