import type { Metadata } from 'next'
import { locales, defaultLocale } from '@/i18n/config'

export const SITE_URL = 'https://wcpos.com'

/**
 * Build the public URL for a path in a given locale.
 *
 * Mirrors the next-intl routing config (`localePrefix: 'as-needed'`):
 * the default locale (en) has no URL prefix, all other locales are
 * prefixed (e.g. /fr/pro).
 */
export function localeUrl(locale: string, path = '/'): string {
  const normalizedPath = path === '/' ? '' : path
  if (locale === defaultLocale) {
    return `${SITE_URL}${normalizedPath}`
  }
  return `${SITE_URL}/${locale}${normalizedPath}`
}

/**
 * hreflang map for a path across all supported locales, plus x-default
 * pointing at the unprefixed (default-locale) URL.
 */
export function languageAlternates(path = '/'): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[locale] = localeUrl(locale, path)
  }
  languages['x-default'] = localeUrl(defaultLocale, path)
  return languages
}

/**
 * Metadata for public marketing pages: title/description plus a
 * locale-aware canonical URL and hreflang alternates.
 */
export function marketingMetadata({
  locale,
  path = '/',
  title,
  description,
}: {
  locale: string
  path?: string
  title?: string
  description?: string
}): Metadata {
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: {
      canonical: localeUrl(locale, path),
      languages: languageAlternates(path),
    },
  }
}
