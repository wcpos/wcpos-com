import { defaultLocale, locales, type Locale } from '@/i18n/config'

type SanitizeRedirectOptions = {
  fallback?: string
  stripLocalePrefix?: boolean
}

// Browsers strip \t, \n and \r from a URL before parsing it, so
// "/\n/evil.example" would navigate to "//evil.example".
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/**
 * Sanitizes a user-supplied post-auth redirect target.
 *
 * The ?redirect query param is attacker-controllable (an emailed link like
 * /login?redirect=https://evil.com would navigate off-site right after
 * credential entry), so only same-origin relative paths survive:
 * - must start with exactly one "/" ("//host" and "/\host" are
 *   protocol-relative URLs to browsers)
 * - no control characters: browsers strip tab/CR/LF anywhere in a URL before
 *   parsing it, so "/\n/evil.example" reaches the network as "//evil.example"
 * - no URL scheme
 * - a leading locale prefix is stripped so next-intl's locale-aware router
 *   does not double-prefix (e.g. /fr/account pushed on an fr page would
 *   become /fr/fr/account and 404)
 */
export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallbackOrOptions: string | SanitizeRedirectOptions = '/account'
): string {
  const options =
    typeof fallbackOrOptions === 'string'
      ? { fallback: fallbackOrOptions, stripLocalePrefix: true }
      : {
          fallback: fallbackOrOptions.fallback ?? '/account',
          stripLocalePrefix: fallbackOrOptions.stripLocalePrefix ?? true,
        }
  const fallback = options.fallback

  if (!value) return fallback
  if (CONTROL_CHARS.test(value)) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback

  if (options.stripLocalePrefix) {
    for (const locale of locales) {
      if (value === `/${locale}`) return '/'
      if (value.startsWith(`/${locale}/`)) {
        return value.slice(locale.length + 1)
      }
    }
  }

  return value
}

export function localeFromPath(path: string): Locale {
  for (const locale of locales) {
    if (path === `/${locale}` || path.startsWith(`/${locale}/`)) {
      return locale
    }
  }
  return defaultLocale
}

export function localizeRedirectPath(path: string, locale: Locale): string {
  if (locale === defaultLocale) return path
  if (path === '/') return `/${locale}`
  return `/${locale}${path}`
}

/**
 * Navigate after the session cookie changed identity (sign-in, sign-up,
 * reset-that-signs-in, or a dead session detected on a 401).
 *
 * Always a FULL document navigation, never router.push: the client router
 * keeps RSC payloads rendered under the old identity (PPR shells advertise a
 * 5-minute client stale time under cacheComponents), and router.refresh()
 * provably does not purge them — a soft navigation kept re-rendering the
 * signed-out checkout until the customer manually reloaded. A full load also
 * matches the auth transitions that never had this bug: OAuth returns via
 * HTTP redirects and logout is a real form POST.
 *
 * `path` must already be sanitized (sanitizeRedirectPath) and bare of any
 * locale prefix; the current surface locale is re-applied here because,
 * unlike the i18n router, the browser will not add it for us.
 */
export function navigateAfterAuthChange(path: string, locale: Locale): void {
  window.location.assign(localizeRedirectPath(path, locale))
}
