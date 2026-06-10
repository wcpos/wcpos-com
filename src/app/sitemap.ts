import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'
import { languageAlternates, localeUrl } from '@/lib/seo'

/**
 * Public marketing routes only. Account, auth, checkout, and API routes
 * are intentionally excluded (private and/or noindexed).
 */
const marketingRoutes = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/pro', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/roadmap', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.5 },
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return marketingRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: localeUrl(locale, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: languageAlternates(route.path),
      },
    }))
  )
}
