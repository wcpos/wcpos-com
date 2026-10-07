import type { Metadata } from 'next'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

export const SITE_URL = 'https://wcpos.com'

// PNGs are rendered by scripts/og-image/generate-page-cards.mjs.
// Paths without an entry use the site card.
export const DEFAULT_SOCIAL_CARD = '/opengraph-image.png'
export const SOCIAL_CARDS: Record<string, string> = {
  '/pro': '/og/pro.png',
  '/downloads': '/og/downloads.png',
  '/support': '/og/support.png',
  '/roadmap': '/og/roadmap.png',
  '/about-us': '/og/about-us.png',
  '/compare': '/og/compare.png',
  '/compare/oliver-pos': '/og/compare-oliver-pos.png',
  '/compare/woocommerce-pos': '/og/compare-woocommerce-pos.png',
  '/compare/square': '/og/compare-square.png',
  '/compare/jovvie': '/og/compare-jovvie.png',
  '/compare/vitepos': '/og/compare-vitepos.png',
  '/compare/yith-pos': '/og/compare-yith-pos.png',
  '/extensions': '/og/extensions.png',
  '/changelog': '/og/changelog.png',
  '/compare/foosales': '/og/compare-foosales.png',
}

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  de: 'de_DE',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  ja: 'ja_JP',
  ko: 'ko_KR',
  nl: 'nl_NL',
  pt: 'pt_PT',
  zh: 'zh_CN',
}

export function openGraphLocale(locale: Locale): string {
  return OPEN_GRAPH_LOCALES[locale]
}

export function alternateOpenGraphLocales(locale: Locale): string[] {
  return locales
    .filter((alternateLocale) => alternateLocale !== locale)
    .map((alternateLocale) => openGraphLocale(alternateLocale))
}

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
  locale: Locale
  path?: string
  title?: string
  description?: string
}): Metadata {
  const canonical = localeUrl(locale, path)
  const image = SOCIAL_CARDS[path] ?? DEFAULT_SOCIAL_CARD
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: {
      canonical,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: 'website',
      siteName: 'WCPOS',
      locale: openGraphLocale(locale),
      alternateLocale: alternateOpenGraphLocales(locale),
      url: canonical,
      images: [image],
    },
    twitter: { card: 'summary_large_image', images: [image] },
  }
}
