import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type enJson from '../../../../../messages/en.json'
import type nlJson from '../../../../../messages/nl.json'

type EnMessages = typeof enJson
type NlMessages = typeof nlJson

function loadMessages<T>(locale: string): T {
  const raw = fs.readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
  return JSON.parse(raw) as T
}

function collectStrings(value: unknown, keyPath: string, out: [string, string][]): void {
  if (typeof value === 'string') {
    out.push([keyPath, value])
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, keyPath ? `${keyPath}.${key}` : key, out)
    }
  }
}

const en = loadMessages<EnMessages>('en')
const nl = loadMessages<NlMessages>('nl')

describe('/pro copy terms', () => {
  it('says "register", not "till", on the English display card', () => {
    const description: string = en.pro.features.display.description
    expect(description).toContain('register')
    expect(description).not.toMatch(/\btill\b/)
  })

  it('says "register", not "till", in the English beta warning', () => {
    expect(en.account.downloads.beta.warning).not.toMatch(/\btill\b/)
  })

  it('translates "priority support" in every Dutch /pro string', () => {
    const strings: [string, string][] = []
    collectStrings(nl.pro, 'pro', strings)
    expect(strings.length).toBeGreaterThan(0)
    const offenders = strings.filter(([, text]) => text.includes('priority support'))
    expect(offenders.map(([key]) => key)).toEqual([])
  })
})
