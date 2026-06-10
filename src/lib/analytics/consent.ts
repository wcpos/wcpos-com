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
 */
export const ANALYTICS_CONSENT_COOKIE = 'wcpos-analytics-consent'

export type AnalyticsConsentStatus = 'granted' | 'denied'

/** CNIL guidance caps consent validity at 13 months; we re-ask after 6. */
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182

export function parseAnalyticsConsent(
  value: string | null | undefined
): AnalyticsConsentStatus | null {
  if (value === 'granted' || value === 'denied') {
    return value
  }
  return null
}

export function hasAnalyticsConsent(value: string | null | undefined): boolean {
  return parseAnalyticsConsent(value) === 'granted'
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

function readDocumentCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const prefix = `${name}=`
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(prefix))

  if (!match) {
    return null
  }

  try {
    return decodeURIComponent(match.slice(prefix.length))
  } catch {
    // Malformed % sequences in user-controlled cookies must fail closed,
    // not crash consent reads.
    return null
  }
}

/** Client-side read of the consent decision. Returns null when undecided. */
export function readAnalyticsConsent(): AnalyticsConsentStatus | null {
  return parseAnalyticsConsent(readDocumentCookie(ANALYTICS_CONSENT_COOKIE))
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

  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${status}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=Lax${secure}`

  if (status === 'denied') {
    document.cookie = `${ANALYTICS_DISTINCT_ID_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}
