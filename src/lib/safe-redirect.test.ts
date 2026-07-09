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

  // Stripping "/fr" off "/fr//evil.example" re-derives "//evil.example", a
  // protocol-relative URL. The guard has to run on what is returned, not only
  // on what came in.
  it('rejects a protocol-relative URL smuggled behind a locale prefix', () => {
    expect(sanitizeRedirectPath('/fr//evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/de/\\evil.example')).toBe('/account')
    expect(sanitizeRedirectPath('/ko//evil.example', '/')).toBe('/')
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

  // The end-to-end property the sanitizer exists to guarantee: whatever an
  // attacker puts in ?redirect=, the URL handed to the browser must resolve
  // back to our own origin.
  it('never navigates off-origin for any attacker-supplied redirect', () => {
    const hostile = [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/\n/evil.example',
      '/\r\n//evil.example',
      '/\t//evil.example',
      '/fr//evil.example',
      '/de/\\evil.example',
      '/ja/\n//evil.example',
      'javascript:alert(1)',
    ]

    for (const locale of ['en', 'fr'] as const) {
      for (const value of hostile) {
        const assign = vi.fn()
        vi.stubGlobal('location', { assign } as unknown as Location)

        navigateAfterAuthChange(sanitizeRedirectPath(value), locale)

        const target = assign.mock.calls[0][0] as string
        // Resolve exactly as the browser would, against our own origin.
        const resolved = new URL(target, 'https://wcpos.com')
        expect(resolved.origin, `${value} @ ${locale} -> ${target}`).toBe(
          'https://wcpos.com'
        )

        vi.unstubAllGlobals()
      }
    }
  })
})
