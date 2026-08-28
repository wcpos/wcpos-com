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
/**
 * "Connect a second provider" intent, set only by an initiate request that
 * carried `intent=link` from a signed-in customer. The value binds the
 * callback to THIS browser's round-trip: it carries the provider and the
 * OAuth `state` Medusa minted for it, and the callback takes the link branch
 * only when both match. A callback URL minted elsewhere (login-CSRF style)
 * can therefore never be replayed into someone else's link flow.
 */
export const OAUTH_LINK_COOKIE = 'oauth_link'

export function encodeOAuthLinkCookie(provider: string, state: string): string {
  return `${provider}:${state}`
}

export function parseOAuthLinkCookie(
  value: string | undefined
): { provider: string; state: string } | null {
  if (!value) return null
  const separator = value.indexOf(':')
  if (separator <= 0 || separator === value.length - 1) return null
  return { provider: value.slice(0, separator), state: value.slice(separator + 1) }
}

export const OAUTH_REDIRECT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 600,
} as const
