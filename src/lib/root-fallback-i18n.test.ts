import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { locales } from '@/i18n/config'
import {
  ROOT_FALLBACK_MESSAGES,
  resolveRootFallbackLocale,
  rootFallbackCopy,
} from './root-fallback-i18n'

describe('root fallback i18n', () => {
  it('resolves weighted Accept-Language headers to supported locales', () => {
    expect(resolveRootFallbackLocale('fr-CA;q=0.6,de-DE;q=0.9')).toBe('de')
  })

  it('resolves browser language arrays to supported base locales', () => {
    expect(resolveRootFallbackLocale(['pt-BR', 'en-US'])).toBe('pt')
  })

  it('falls back to English when preferences are missing or unsupported', () => {
    expect(resolveRootFallbackLocale('*,zz-ZZ;q=0.9')).toBe('en')
    expect(resolveRootFallbackLocale(null)).toBe('en')
  })

  it('returns translated copy from existing message files', () => {
    const copy = rootFallbackCopy('ja-JP,ja;q=0.9')

    expect(copy.locale).toBe('ja')
    expect(copy.direction).toBe('ltr')
    expect(copy.errors.notFoundTitle).toBe('ページが見つかりません')
    expect(copy.support).toBe('サポート')
  })

  // The fallback strings are inlined (importing the catalogs from this
  // client-reachable module would ship every locale's full catalog in the
  // shared bundle of every page). This pins each inlined string to its
  // source-of-truth entry in messages/*.json.
  it.each(locales)('matches the %s message catalog', (locale) => {
    const catalog = JSON.parse(
      readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8')
    ) as { errors: Record<string, string>; header: { support: string } }
    const inlined = ROOT_FALLBACK_MESSAGES[locale]

    for (const key of Object.keys(inlined.errors) as Array<
      keyof typeof inlined.errors
    >) {
      expect(inlined.errors[key], `errors.${key} (${locale})`).toBe(
        catalog.errors[key]
      )
    }
    expect(inlined.support, `header.support (${locale})`).toBe(
      catalog.header.support
    )
  })
})
