import { describe, expect, it } from 'vitest'
import { resolveRootFallbackLocale, rootFallbackCopy } from './root-fallback-i18n'

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
})
