import { beforeEach, describe, expect, it } from 'vitest'
import { ANALYTICS_DISTINCT_ID_COOKIE } from './distinct-id'
import {
  ANALYTICS_CONSENT_COOKIE,
  consentCookieDomain,
  getConsentCookieOptions,
  isAnalyticsGranted,
  mostRestrictiveConsent,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  readAnalyticsConsentFromCookieHeader,
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

describe('mostRestrictiveConsent', () => {
  it('lets denial win over a coexisting grant (fail-closed)', () => {
    // The migration case: a stale host-scoped `granted` alongside a later
    // shared `denied` must resolve to denied, whatever order they appear in.
    expect(mostRestrictiveConsent(['granted', 'denied'])).toBe('denied')
    expect(mostRestrictiveConsent(['denied', 'granted'])).toBe('denied')
  })

  it('returns granted only when every present value grants', () => {
    expect(mostRestrictiveConsent(['granted'])).toBe('granted')
    expect(mostRestrictiveConsent(['granted', 'granted'])).toBe('granted')
  })

  it('returns null when nothing has been decided, ignoring junk values', () => {
    expect(mostRestrictiveConsent([])).toBeNull()
    expect(mostRestrictiveConsent([undefined, null, '', 'yes'])).toBeNull()
    // A junk value must not mask a real grant.
    expect(mostRestrictiveConsent(['yes', 'granted'])).toBe('granted')
  })
})

describe('readAnalyticsConsentFromCookieHeader', () => {
  it('reads the decision from a raw Cookie header', () => {
    expect(
      readAnalyticsConsentFromCookieHeader(
        `foo=1; ${ANALYTICS_CONSENT_COOKIE}=granted; bar=2`
      )
    ).toBe('granted')
  })

  it('honors a denial even when a duplicate granted cookie is also present', () => {
    // request.cookies.get() would collapse these to one arbitrary value; the
    // header reader sees both and must fail closed to denied.
    expect(
      readAnalyticsConsentFromCookieHeader(
        `${ANALYTICS_CONSENT_COOKIE}=granted; ${ANALYTICS_CONSENT_COOKIE}=denied`
      )
    ).toBe('denied')
  })

  it('returns null for an empty, missing, or decision-free header', () => {
    expect(readAnalyticsConsentFromCookieHeader('')).toBeNull()
    expect(readAnalyticsConsentFromCookieHeader(null)).toBeNull()
    expect(readAnalyticsConsentFromCookieHeader(undefined)).toBeNull()
    expect(readAnalyticsConsentFromCookieHeader('other=1')).toBeNull()
  })
})

describe('isAnalyticsGranted', () => {
  beforeEach(() => {
    clearCookies()
  })

  it('is true only when the cookie records an explicit grant', () => {
    expect(isAnalyticsGranted()).toBe(false)

    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=denied; Path=/`
    expect(isAnalyticsGranted()).toBe(false)

    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=granted; Path=/`
    expect(isAnalyticsGranted()).toBe(true)
  })
})

describe('consentCookieDomain', () => {
  it('scopes consent to .wcpos.com across the production family so a decision is shared', () => {
    expect(consentCookieDomain('wcpos.com')).toBe('.wcpos.com')
    expect(consentCookieDomain('docs.wcpos.com')).toBe('.wcpos.com')
    expect(consentCookieDomain('www.wcpos.com')).toBe('.wcpos.com')
  })

  it('stays host-scoped (null) off the wcpos.com family so the cookie is not rejected', () => {
    // localhost dev, e2e over http://localhost, and Vercel preview deploys must
    // keep working: a Domain=.wcpos.com cookie set from these hosts is dropped.
    expect(consentCookieDomain('localhost')).toBeNull()
    expect(consentCookieDomain('wcpos-com-git-preview.vercel.app')).toBeNull()
    // A lookalike suffix must not match — only wcpos.com itself or a subdomain.
    expect(consentCookieDomain('notwcpos.com')).toBeNull()
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
