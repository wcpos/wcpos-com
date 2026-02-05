import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account/', '/api/', '/admin/'],
    },
    sitemap: 'https://wcpos.com/sitemap.xml',
  }
}
