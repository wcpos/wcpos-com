import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account',
        '/api/',
        '/admin',
        '/login',
        '/register',
        '/pro/checkout',
        // Locale-prefixed variants (e.g. /fr/login)
        '/*/account',
        '/*/login',
        '/*/register',
        '/*/pro/checkout',
      ],
    },
    sitemap: 'https://wcpos.com/sitemap.xml',
  }
}
