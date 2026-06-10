import { locales } from '@/i18n/config'

/**
 * Sanitizes a user-supplied post-auth redirect target.
 *
 * The ?redirect query param is attacker-controllable (an emailed link like
 * /login?redirect=https://evil.com would navigate off-site right after
 * credential entry), so only same-origin relative paths survive:
 * - must start with exactly one "/" ("//host" and "/\host" are
 *   protocol-relative URLs to browsers)
 * - no URL scheme
 * - a leading locale prefix is stripped so next-intl's locale-aware router
 *   does not double-prefix (e.g. /fr/account pushed on an fr page would
 *   become /fr/fr/account and 404)
 */
export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback = '/account'
): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback

  for (const locale of locales) {
    if (value === `/${locale}`) return '/'
    if (value.startsWith(`/${locale}/`)) {
      return value.slice(locale.length + 1)
    }
  }

  return value
}
