import { describe, expect, it, vi } from 'vitest'
import {
  localizeRedirectPath,
  navigateAfterAuthChange,
  sanitizeRedirectPath,
} from './safe-redirect'

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

  // Browsers strip tab/CR/LF from a URL before parsing, so a path that only
  // looks single-slashed reaches the network as a protocol-relative URL.
  it('rejects control characters smuggled into the path', () => {
    expect(sanitizeRedirectPath('/\n/evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/\r/evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/\t/evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/\r\n/evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/account\n')).toBe('/account')
    expect(sanitizeRedirectPath('/\x00/evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('\n//evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/fr\n/evil.example')).toBe('/account')
  })

  it('strips a leading locale prefix so the locale router does not double-prefix', () => {
    expect(sanitizeRedirectPath('/fr/account')).toBe('/account')
    expect(sanitizeRedirectPath('/de/pro/checkout')).toBe('/pro/checkout')
    expect(sanitizeRedirectPath('/fr')).toBe('/')
  })

  it('can preserve a leading locale prefix for server-side redirects', () => {
    expect(
      sanitizeRedirectPath('/fr/account', { stripLocalePrefix: false })
    ).toBe('/fr/account')
    expect(
      sanitizeRedirectPath('/de/pro/checkout', { stripLocalePrefix: false })
    ).toBe('/de/pro/checkout')
  })

  it('does not strip path segments that merely start with a locale string', () => {
    expect(sanitizeRedirectPath('/free-stuff')).toBe('/free-stuff')
  })

  it('honours a custom fallback', () => {
    expect(sanitizeRedirectPath('https://evil.com', '/')).toBe('/')
  })
})

describe('localizeRedirectPath', () => {
  // The default locale must stay unprefixed (localePrefix: 'as-needed') —
  // '/en/account' is not a route and would 404 the post-auth navigation.
  it('leaves default-locale paths unprefixed', () => {
    expect(localizeRedirectPath('/account', 'en')).toBe('/account')
    expect(localizeRedirectPath('/', 'en')).toBe('/')
  })

  it('prefixes non-default locales, including the bare root', () => {
    expect(localizeRedirectPath('/pro/checkout?variant=yearly', 'fr')).toBe(
      '/fr/pro/checkout?variant=yearly'
    )
    expect(localizeRedirectPath('/', 'de')).toBe('/de')
  })
})

describe('navigateAfterAuthChange', () => {
  it('performs a full document navigation to the localized path', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign } as unknown as Location)

    navigateAfterAuthChange('/account', 'en')
    expect(assign).toHaveBeenCalledWith('/account')

    navigateAfterAuthChange('/pro/checkout', 'fr')
    expect(assign).toHaveBeenCalledWith('/fr/pro/checkout')

    vi.unstubAllGlobals()
  })
})
