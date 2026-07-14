import { ANALYTICS_DISTINCT_ID_COOKIE } from './distinct-id'

/**
 * GDPR analytics consent.
 *
 * Consent state is stored in a single cookie readable by both the client
 * (banner, PostHog capture) and the middleware (distinct-id cookie gating):
 *
 * - missing cookie  -> no decision yet: banner shown, analytics disabled
 * - 'granted'       -> analytics enabled, middleware may set the distinct-id cookie
 * - 'denied'        -> analytics disabled, distinct-id cookie is removed
 *
 * The cookie is scoped to `.wcpos.com` (see consentCookieDomain) so a decision
 * made here carries to the other properties in the family — accept/decline once
 * on wcpos.com and docs.wcpos.com honours it without showing its own banner,
 * and vice versa. The docs writer sets the same Domain, so both ends agree.
 */
export const ANALYTICS_CONSENT_COOKIE = 'wcpos-analytics-consent'

/**
 * Classifies consent before the body is parsed so the prerendered banner can
 * be visible for undecided visitors without flashing for returning visitors.
 * Keep this beside the canonical consent parser: it mirrors the same
 * malformed-value handling and denial-wins duplicate-cookie policy.
 */
export const ANALYTICS_CONSENT_BOOTSTRAP_SCRIPT = `(()=>{const n=${JSON.stringify(
  ANALYTICS_CONSENT_COOKIE
)},p=n+'=',v=document.cookie.split('; ').filter(c=>c.startsWith(p)).map(c=>{try{return decodeURIComponent(c.slice(p.length))}catch{return''}});document.documentElement.dataset.analyticsConsent=v.includes('denied')?'denied':v.includes('granted')?'granted':'undecided'})()`

export type AnalyticsConsentStatus = 'granted' | 'denied'

/** CNIL guidance caps consent validity at 13 months; we re-ask after 6. */
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182

/**
 * Cookie Domain that shares the consent decision across every *.wcpos.com
 * property. Returns null for any other host — localhost dev, e2e (served over
 * http://localhost), Vercel preview deploys — because a browser silently
 * rejects a `Domain=.wcpos.com` cookie set from a host that isn't under
 * wcpos.com, which would break consent persistence there. Kept as a pure
 * function of the hostname so it is testable without a DOM.
 */
export function consentCookieDomain(hostname: string): string | null {
  return hostname === 'wcpos.com' || hostname.endsWith('.wcpos.com')
    ? '.wcpos.com'
    : null
}

export function parseAnalyticsConsent(
  value: string | null | undefined
): AnalyticsConsentStatus | null {
  if (value === 'granted' || value === 'denied') {
    return value
  }
  return null
}

export function getConsentCookieOptions() {
  return {
    path: '/',
    maxAge: CONSENT_MAX_AGE_SECONDS,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  }
}

/**
 * Collect every value stored under `name` in a Cookie-header-formatted string
 * ("a=1; b=2; a=3"). One name can legitimately appear more than once when
 * same-name cookies exist at different scopes — e.g. a legacy host-scoped
 * `wcpos-analytics-consent` alongside the shared `.wcpos.com` one this change
 * introduces. Callers reconcile duplicates via mostRestrictiveConsent.
 */
function collectCookieValues(cookieString: string, name: string): string[] {
  const prefix = `${name}=`
  const values: string[] = []

  for (const part of cookieString.split('; ')) {
    if (!part.startsWith(prefix)) {
      continue
    }
    try {
      values.push(decodeURIComponent(part.slice(prefix.length)))
    } catch {
      // Malformed % sequences in user-controlled cookies must fail closed
      // (skip this entry), not crash consent reads.
    }
  }

  return values
}

/**
 * Reconcile possibly-conflicting consent values into one decision:
 * denial wins over consent, which wins over "undecided".
 *
 * Deliberately fail-closed. During the migration to the shared `.wcpos.com`
 * cookie an existing visitor can briefly carry both a stale host-scoped cookie
 * and the new shared one; a browser exposes both under the same name with no
 * way to tell which is newer. If they disagree we must never let a leftover
 * `granted` override a later `denied` — analytics stays off unless every
 * present value agrees it may run.
 */
export function mostRestrictiveConsent(
  values: Array<string | null | undefined>
): AnalyticsConsentStatus | null {
  let sawGranted = false

  for (const value of values) {
    const parsed = parseAnalyticsConsent(value)
    if (parsed === 'denied') {
      return 'denied'
    }
    if (parsed === 'granted') {
      sawGranted = true
    }
  }

  return sawGranted ? 'granted' : null
}

/** Client-side read of the consent decision. Returns null when undecided. */
export function readAnalyticsConsent(): AnalyticsConsentStatus | null {
  if (typeof document === 'undefined') {
    return null
  }

  return mostRestrictiveConsent(
    collectCookieValues(document.cookie, ANALYTICS_CONSENT_COOKIE)
  )
}

/**
 * Server-side read of the consent decision from a raw Cookie header
 * ("a=1; b=2"). Middleware and server analytics see the raw header and can
 * therefore observe duplicate same-name cookies that `request.cookies.get()` /
 * `cookies().get()` collapse to a single value — so they must reconcile here
 * with the same fail-closed rule as the client. Returns null when undecided.
 */
export function readAnalyticsConsentFromCookieHeader(
  cookieHeader: string | null | undefined
): AnalyticsConsentStatus | null {
  return mostRestrictiveConsent(
    collectCookieValues(cookieHeader ?? '', ANALYTICS_CONSENT_COOKIE)
  )
}

/**
 * Client-side gate for browser analytics: true only on an explicit grant.
 *
 * The single source for the "may we capture in the browser?" decision — both
 * posthog init and event capture call this, so the GDPR rule for the browser
 * runtime lives in exactly one place. (The server has its own async,
 * request-scoped gate in posthog-service; see docs/adr/0011.)
 */
export function isAnalyticsGranted(): boolean {
  return readAnalyticsConsent() === 'granted'
}

/**
 * Client-side write of the consent decision.
 *
 * Denying consent also removes the analytics distinct-id cookie immediately
 * (the middleware does the same on subsequent requests).
 *
 * The Secure attribute follows the actual page protocol rather than
 * NODE_ENV: WebKit rejects Secure cookies set over plain http (no localhost
 * exemption, unlike Chromium/Firefox), and e2e runs serve a production
 * build over http://localhost.
 */
export function writeAnalyticsConsent(status: AnalyticsConsentStatus): void {
  if (typeof document === 'undefined') {
    return
  }

  const options = getConsentCookieOptions()
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domain = consentCookieDomain(window.location.hostname)
  const domainAttr = domain ? `; Domain=${domain}` : ''

  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${status}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=Lax${secure}${domainAttr}`

  if (domain) {
    // We just wrote the shared `.wcpos.com` cookie. Expire any legacy
    // host-scoped cookie of the same name (deleting without a Domain attribute
    // targets only the host-scoped entry, leaving the shared cookie intact) so
    // a stale host `granted` can never outlive — and shadow — this decision.
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }

  if (status === 'denied') {
    document.cookie = `${ANALYTICS_DISTINCT_ID_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}
