import 'server-only'

import { redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'

/** Path to the login page for a locale (localePrefix: 'as-needed'). */
export function loginPathForLocale(locale: string): string {
  return locale === routing.defaultLocale ? '/login' : `/${locale}/login`
}

/**
 * Redirects to the login page VIA the logout route handler, so an invalid
 * medusa-token cookie is cleared on the way.
 *
 * Redirecting straight to /login would loop: the middleware treats cookie
 * presence as logged-in and bounces /login back to /account, while account
 * pages bounce Medusa 401s back to /login. Server components cannot delete
 * cookies themselves, so the cookie removal happens in the route handler.
 *
 * Uses next/navigation's redirect (not next-intl's) because /api paths must
 * not be locale-prefixed; the post-logout target carries the locale instead.
 */
export function redirectToLoginClearingSession(locale: string): never {
  redirect(
    `/api/auth/logout?to=${encodeURIComponent(loginPathForLocale(locale))}`
  )
}
