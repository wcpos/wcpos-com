import { describe, expect, it } from 'vitest'
import {
  languagePreferences,
  supportedBaseLocale,
  supportedCanonicalLocale,
} from './locale-preferences'

describe('locale preference parsing', () => {
  it('orders language preferences by q weight while preserving tie order', () => {
    expect(languagePreferences('en-US;q=0.2, fr-FR;q=0.9, de-DE;q=0.9')).toEqual([
      'fr-FR',
      'de-DE',
      'en-US',
    ])
  })

  it('treats Accept-Language q parameters case-insensitively', () => {
    expect(supportedBaseLocale('en-US;Q=0.1, fr-FR;Q=0.9')).toBe('fr')
    expect(supportedCanonicalLocale('en-US;Q=0.1, fr-FR;Q=0.9')).toBe('fr-FR')
  })

  it('ignores malformed and wildcard preferences before selecting a supported locale', () => {
    expect(supportedBaseLocale('*, not a locale;q=1, ja-JP;q=0.8')).toBe('ja')
  })
})
