import { describe, expect, it } from 'vitest'
import { sanitizeRedirectPath } from './safe-redirect'

describe('sanitizeRedirectPath', () => {
  it('allows simple same-origin paths', () => {
    expect(sanitizeRedirectPath('/pro/checkout?variant=yearly')).toBe(
      '/pro/checkout?variant=yearly'
    )
    expect(sanitizeRedirectPath('/account/licenses')).toBe('/account/licenses')
  })

  it('falls back for missing values', () => {
    expect(sanitizeRedirectPath(null)).toBe('/account')
    expect(sanitizeRedirectPath(undefined)).toBe('/account')
    expect(sanitizeRedirectPath('')).toBe('/account')
  })

  it('rejects absolute URLs', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/account')
    expect(sanitizeRedirectPath('http://evil.com/account')).toBe('/account')
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/account')
  })

  it('rejects protocol-relative and backslash tricks', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/account')
    expect(sanitizeRedirectPath('/\\evil.com')).toBe('/account')
  })

  it('strips a leading locale prefix so the locale router does not double-prefix', () => {
    expect(sanitizeRedirectPath('/fr/account')).toBe('/account')
    expect(sanitizeRedirectPath('/de/pro/checkout')).toBe('/pro/checkout')
    expect(sanitizeRedirectPath('/fr')).toBe('/')
  })

  it('does not strip path segments that merely start with a locale string', () => {
    expect(sanitizeRedirectPath('/free-stuff')).toBe('/free-stuff')
  })

  it('honours a custom fallback', () => {
    expect(sanitizeRedirectPath('https://evil.com', '/')).toBe('/')
  })
})
