import { beforeEach, describe, expect, it } from 'vitest'
import { ANALYTICS_DISTINCT_ID_COOKIE } from './distinct-id'
import {
  ANALYTICS_CONSENT_COOKIE,
  getConsentCookieOptions,
  hasAnalyticsConsent,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from './consent'

function clearCookies() {
  for (const part of document.cookie.split('; ')) {
    const name = part.split('=')[0]
    if (name) {
      document.cookie = `${name}=; Path=/; Max-Age=0`
    }
  }
}

describe('parseAnalyticsConsent', () => {
  it('parses granted and denied', () => {
    expect(parseAnalyticsConsent('granted')).toBe('granted')
    expect(parseAnalyticsConsent('denied')).toBe('denied')
  })

  it('returns null for missing or unknown values', () => {
    expect(parseAnalyticsConsent(undefined)).toBeNull()
    expect(parseAnalyticsConsent(null)).toBeNull()
    expect(parseAnalyticsConsent('')).toBeNull()
    expect(parseAnalyticsConsent('yes')).toBeNull()
  })
})

describe('hasAnalyticsConsent', () => {
  it('is true only for an explicit grant', () => {
    expect(hasAnalyticsConsent('granted')).toBe(true)
    expect(hasAnalyticsConsent('denied')).toBe(false)
    expect(hasAnalyticsConsent(undefined)).toBe(false)
    expect(hasAnalyticsConsent('anything-else')).toBe(false)
  })
})

describe('getConsentCookieOptions', () => {
  it('is readable by client JavaScript and scoped to the whole site', () => {
    const options = getConsentCookieOptions()

    expect(options.httpOnly).toBe(false)
    expect(options.path).toBe('/')
    expect(options.sameSite).toBe('lax')
    expect(options.maxAge).toBeGreaterThan(0)
  })
})

describe('readAnalyticsConsent / writeAnalyticsConsent', () => {
  beforeEach(() => {
    clearCookies()
  })

  it('returns null when no decision has been recorded', () => {
    expect(readAnalyticsConsent()).toBeNull()
  })

  it('fails closed on malformed percent sequences in the cookie', () => {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=%E0%`
    expect(readAnalyticsConsent()).toBeNull()
  })

  it('round-trips a granted decision', () => {
    writeAnalyticsConsent('granted')

    expect(readAnalyticsConsent()).toBe('granted')
    expect(document.cookie).toContain(`${ANALYTICS_CONSENT_COOKIE}=granted`)
  })

  it('round-trips a denied decision', () => {
    writeAnalyticsConsent('denied')

    expect(readAnalyticsConsent()).toBe('denied')
  })

  it('removes the distinct-id cookie when consent is denied', () => {
    document.cookie = `${ANALYTICS_DISTINCT_ID_COOKIE}=anon_123; Path=/`

    writeAnalyticsConsent('denied')

    expect(document.cookie).not.toContain(ANALYTICS_DISTINCT_ID_COOKIE)
  })

  it('keeps the distinct-id cookie when consent is granted', () => {
    document.cookie = `${ANALYTICS_DISTINCT_ID_COOKIE}=anon_123; Path=/`

    writeAnalyticsConsent('granted')

    expect(document.cookie).toContain(`${ANALYTICS_DISTINCT_ID_COOKIE}=anon_123`)
  })
})
