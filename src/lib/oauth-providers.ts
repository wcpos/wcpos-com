/**
 * OAuth providers supported for customer login.
 * Shared by the OAuth initiate and callback routes.
 */
export const ALLOWED_PROVIDERS: readonly string[] = ['google', 'github', 'discord']

/**
 * Post-sign-in destination, carried across the provider round-trip in a
 * short-lived cookie. It must NEVER ride on the callback URL: providers match
 * `redirect_uri` byte-for-byte against the registered URI (query string
 * included), so `…/callback?redirect=/pro` fails with redirect_uri_mismatch
 * even when `…/callback` is registered — verified live against Google
 * 2026-07-03.
 */
export const OAUTH_REDIRECT_COOKIE = 'oauth_redirect'

export const OAUTH_REDIRECT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 600,
} as const

/**
 * "Connect a second provider" intent, set only by an initiate request that
 * carried `intent=link` from a signed-in customer. One cookie PER PROVIDER so
 * two flows started in parallel (Google in one tab, GitHub in another) can't
 * overwrite each other's binding. The value ties the callback to THIS
 * browser's round-trip and THIS customer: the OAuth `state` Medusa minted for
 * it, plus the customer id that started it. The callback takes the link
 * branch whenever the provider's cookie exists and fails closed on any
 * mismatch — a link intent never falls through to sign-in.
 */
export const OAUTH_LINK_COOKIE_PREFIX = 'oauth_link_'

export function oauthLinkCookieName(provider: string): string {
  return `${OAUTH_LINK_COOKIE_PREFIX}${provider}`
}

/**
 * Outlives Medusa's own OAuth state (1200 s, `setState` default in
 * @medusajs/auth). Once this cookie is gone the provider `state` is gone too,
 * so a late link callback can only fail — it can never be mistaken for a
 * sign-in.
 */
export const OAUTH_LINK_COOKIE_OPTIONS = {
  ...OAUTH_REDIRECT_COOKIE_OPTIONS,
  maxAge: 1800,
} as const

export function encodeOAuthLinkCookie(state: string, customerId: string): string {
  return `${state}:${customerId}`
}

export function parseOAuthLinkCookie(
  value: string | undefined
): { state: string; customerId: string } | null {
  if (!value) return null
  const separator = value.lastIndexOf(':')
  if (separator <= 0 || separator === value.length - 1) return null
  return { state: value.slice(0, separator), customerId: value.slice(separator + 1) }
}
