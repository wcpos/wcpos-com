import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'] as const

const EN_DESCRIPTION =
  'WCPOS Pro for WooCommerce adds more registers and multiple stores, terminal payments, a customer-facing display, stock and price editing, order and customer management, full reports, custom payment gateways and priority support.'

interface ProMessages {
  pro: {
    schema: { description: string }
    features: { display: { title: string } }
  }
}

function loadMessages(locale: string): ProMessages {
  const raw = fs.readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
  return JSON.parse(raw) as ProMessages
}

describe('/pro SoftwareApplication description', () => {
  it.each(LOCALES)('%s follows the page: no "Premium" opener, names the display', (locale) => {
    const { pro } = loadMessages(locale)
    const description = pro.schema.description
    expect(description.toLowerCase()).not.toContain('premium')
    expect(description.startsWith('WCPOS Pro')).toBe(true)
    expect(description.toLowerCase()).toContain(pro.features.display.title.toLowerCase())
  })

  it('en reads exactly as the page orders its features', () => {
    expect(loadMessages('en').pro.schema.description).toBe(EN_DESCRIPTION)
  })
})
