import { localeUrl } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * The latest date each /compare/* page's facts were verified or checked
 * again, as the page already shows it in its footer and caption.
 * compare-page-json-ld.test.ts checks every value against the English footer
 * copy, so the two can't drift.
 */
export const COMPARE_FACTS_VERIFIED = {
  'oliver-pos': '2026-07-08',
  'woocommerce-pos': '2026-10-06',
  square: '2026-11-18',
  jovvie: '2026-07-09',
  vitepos: '2026-10-07',
  'yith-pos': '2026-10-07',
  foosales: '2026-10-07',
} as const

export type CompareSlug = keyof typeof COMPARE_FACTS_VERIFIED

export function comparePageJsonLd({ slug, locale, name, description }: {
  slug: CompareSlug
  locale: Locale
  name: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: localeUrl(locale, `/compare/${slug}`),
    name,
    description,
    inLanguage: locale,
    dateModified: COMPARE_FACTS_VERIFIED[slug],
    publisher: { '@type': 'Organization', name: 'WCPOS', url: 'https://wcpos.com' },
  }
}
