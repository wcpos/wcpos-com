import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'
import { PRIVACY_UPDATED_AT, TERMS_UPDATED_AT, REFUNDS_UPDATED_AT } from '@/lib/legal-dates'
import { selectPublishedReleases } from '@/lib/published-releases'
import { languageAlternates, localeUrl } from '@/lib/seo'
import { getReleases } from '@/services/core/external/github-client'

/**
 * Public marketing routes only. Account, auth, checkout, and API routes
 * are intentionally excluded (private and/or noindexed).
 */
export const marketingRoutes = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/downloads', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/pro', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/extensions', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/compare', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare/oliver-pos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare/woocommerce-pos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare/square', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare/jovvie', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare/vitepos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/compare/yith-pos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/about-us', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/roadmap', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/changelog', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refunds', changeFrequency: 'yearly', priority: 0.3 },
] as const

type MarketingPath = (typeof marketingRoutes)[number]['path']

// The plugin repository whose releases /changelog and /downloads list.
const PLUGIN_REPO = 'woocommerce-pos'

/**
 * Dates are each route's last content change, read from the git history of its
 * page, components and messages (checked 2026-10-07). Bump a route's date when
 * its content changes. Legal pages take theirs from @/lib/legal-dates;
 * /changelog and /downloads use the newest published plugin release.
 * /roadmap carries no lastmod because it is built live from wcpos/roadmap
 * issues, so no single date fits.
 */
const CONTENT_UPDATED_AT: Partial<Record<MarketingPath, string>> = {
  '/': '2026-10-07',
  '/pro': '2026-10-07',
  '/extensions': '2026-10-07',
  '/compare': '2026-10-07',
  '/compare/oliver-pos': '2026-10-05',
  '/compare/woocommerce-pos': '2026-10-06',
  '/compare/square': '2026-10-06',
  '/compare/jovvie': '2026-10-07',
  '/compare/vitepos': '2026-10-07',
  '/compare/yith-pos': '2026-10-07',
  '/about-us': '2026-10-06',
  '/support': '2026-10-06',
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const releases = await getReleases(PLUGIN_REPO)
  const [newestRelease] = selectPublishedReleases(releases, 1)
  const updatedAt: Partial<Record<MarketingPath, string>> = {
    ...CONTENT_UPDATED_AT,
    '/privacy': PRIVACY_UPDATED_AT,
    '/terms': TERMS_UPDATED_AT,
    '/refunds': REFUNDS_UPDATED_AT,
    ...(newestRelease ? {
      '/changelog': newestRelease.publishedAt,
      '/downloads': newestRelease.publishedAt,
    } : {}),
  }

  return marketingRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: localeUrl(locale, route.path),
      ...(updatedAt[route.path] ? { lastModified: updatedAt[route.path] } : {}),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: languageAlternates(route.path),
      },
    }))
  )
}
