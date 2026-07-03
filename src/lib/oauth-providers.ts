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
