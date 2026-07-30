import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { defaultLocale, locales, type Locale } from './config'

export function resolveLocale(candidate: string): Locale {
  if (!hasLocale(locales, candidate)) notFound()

  return candidate
}

/**
 * Non-throwing variant for the root [locale] layout ONLY.
 *
 * The [locale] layout must never call notFound(): with cacheComponents,
 * a notFound() thrown from the top-level layout in a production build is
 * not caught by the root not-found boundary — the request 500s instead of
 * 404ing (the HTTPAccessFallbackError escapes as an unhandled RSC error).
 * Dotted paths such as /nonexistent.xyz hit exactly this: the middleware
 * matcher excludes paths containing a dot, so they reach the router with
 * no locale prefix and land in [locale] with locale="nonexistent.xyz".
 *
 * Falling back to the default locale here is safe because every route
 * below the layout still rejects invalid locales via resolveLocale() —
 * the (main)/(auth)/account group layouts and each page call it, and the
 * [...rest] catch-all is an unconditional notFound(). Those throws happen
 * inside the [locale] segment, where the [locale]/not-found.tsx boundary
 * catches them correctly, so the visitor gets the styled 404 with a 404
 * status. See e2e/not-found.spec.ts for the regression coverage.
 */
export function resolveLayoutLocale(candidate: string): Locale {
  return hasLocale(locales, candidate) ? candidate : defaultLocale
}
