import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultLocale, locales } from './config'

const messagesDir = path.resolve(process.cwd(), 'messages')

type Messages = { [key: string]: string | Messages }

function loadMessages(locale: string): Messages {
  const raw = fs.readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8')
  return JSON.parse(raw) as Messages
}

function flattenKeys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null
      ? flattenKeys(value, fullKey)
      : [fullKey]
  })
}

function valueAtPath(messages: Messages, keyPath: string): string | undefined {
  let value: string | Messages | undefined = messages
  for (const key of keyPath.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined
    value = value[key]
  }
  return typeof value === 'string' ? value : undefined
}

const messageFiles = fs
  .readdirSync(messagesDir)
  .filter((file) => file.endsWith('.json'))
const fileLocales = messageFiles.map((file) => file.replace(/\.json$/, ''))

const enKeys = flattenKeys(loadMessages(defaultLocale))
const otherLocales = fileLocales.filter((locale) => locale !== defaultLocale)
const checkoutRecoveryKeys = enKeys.filter((key) =>
  key.startsWith('pro.checkout.recovery.orderPending.')
)
const auditedFrenchNamespacePrefixes = ['roadmap.', 'support.']
const frenchIdenticalCopyAllowlist = new Set([
  'roadmap.meta.title',
  'roadmap.page.eyebrow',
])

describe('messages key parity', () => {
  it('has a messages file for every configured locale', () => {
    const missingFiles = locales.filter(
      (locale) => !fileLocales.includes(locale)
    )
    expect(
      missingFiles,
      'Locales configured in src/i18n/config.ts without a messages/<locale>.json file'
    ).toEqual([])
  })

  it('has a configured locale for every messages file', () => {
    const strayFiles = fileLocales.filter(
      (locale) => !(locales as readonly string[]).includes(locale)
    )
    expect(
      strayFiles,
      'messages/*.json files without a matching locale in src/i18n/config.ts'
    ).toEqual([])
  })

  it(`${defaultLocale}.json has at least one key`, () => {
    expect(enKeys.length).toBeGreaterThan(0)
  })

  it.each(otherLocales)(
    `%s.json has the same keys as ${defaultLocale}.json`,
    (locale) => {
      const localeKeys = flattenKeys(loadMessages(locale))
      const missing = enKeys.filter((key) => !localeKeys.includes(key))
      const extra = localeKeys.filter((key) => !enKeys.includes(key))

      expect(
        { missing, extra },
        [
          `messages/${locale}.json has drifted from messages/${defaultLocale}.json.`,
          missing.length > 0
            ? `Missing keys: ${missing.join(', ')}`
            : undefined,
          extra.length > 0
            ? `Extra keys not in ${defaultLocale}.json: ${extra.join(', ')}`
            : undefined,
        ]
          .filter(Boolean)
          .join('\n')
      ).toEqual({ missing: [], extra: [] })
    }
  )

  it.each(otherLocales)(
    '%s.json translates the payment-received checkout recovery copy',
    (locale) => {
      const english = loadMessages(defaultLocale)
      const localized = loadMessages(locale)
      const untranslatedKeys = checkoutRecoveryKeys.filter((key) => {
        const englishValue = valueAtPath(english, key)
        const localizedValue = valueAtPath(localized, key)
        return englishValue !== undefined && localizedValue === englishValue
      })

      expect(
        untranslatedKeys,
        `messages/${locale}.json must not copy English money-at-risk checkout recovery copy verbatim`
      ).toEqual([])
    }
  )

  it('fr.json translates the audited public support and roadmap copy', () => {
    const english = loadMessages(defaultLocale)
    const french = loadMessages('fr')
    const auditedKeys = enKeys.filter(
      (key) =>
        auditedFrenchNamespacePrefixes.some((prefix) =>
          key.startsWith(prefix)
        ) && !frenchIdenticalCopyAllowlist.has(key)
    )
    const untranslatedKeys = auditedKeys.filter((key) => {
      const englishValue = valueAtPath(english, key)
      const frenchValue = valueAtPath(french, key)
      return (
        englishValue !== undefined &&
        frenchValue === englishValue &&
        /[A-Za-z]{3}/.test(englishValue)
      )
    })

    expect(
      untranslatedKeys,
      'messages/fr.json must not copy audited support/roadmap English strings verbatim'
    ).toEqual([])
  })
})
