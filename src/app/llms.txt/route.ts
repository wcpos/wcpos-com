import { marketingRoutes } from '@/app/sitemap'
import { localeUrl } from '@/lib/seo'
import en from '../../../messages/en.json'

const pageMessageKeys: Record<
  (typeof marketingRoutes)[number]['path'],
  { title: string; description: string }
> = {
  '/': { title: 'metadata.siteTitle', description: 'home.meta.description' },
  '/downloads': { title: 'downloads.meta.title', description: 'downloads.meta.description' },
  '/pro': { title: 'pro.metadata.title', description: 'pro.metadata.description' },
  '/extensions': { title: 'extensions.metadata.title', description: 'extensions.metadata.description' },
  '/compare': { title: 'compare.hub.metadata.title', description: 'compare.hub.metadata.description' },
  '/compare/oliver-pos': { title: 'compare.oliver.metadata.title', description: 'compare.oliver.metadata.description' },
  '/compare/woocommerce-pos': { title: 'compare.woocommerce.metadata.title', description: 'compare.woocommerce.metadata.description' },
  '/compare/square': { title: 'compare.square.metadata.title', description: 'compare.square.metadata.description' },
  '/compare/jovvie': { title: 'compare.jovvie.metadata.title', description: 'compare.jovvie.metadata.description' },
  '/compare/vitepos': { title: 'compare.vitepos.metadata.title', description: 'compare.vitepos.metadata.description' },
  '/about-us': { title: 'about.meta.title', description: 'about.meta.description' },
  '/roadmap': { title: 'roadmap.meta.title', description: 'roadmap.meta.description' },
  '/changelog': { title: 'changelog.meta.title', description: 'changelog.meta.description' },
  '/support': { title: 'support.meta.title', description: 'support.meta.description' },
  '/privacy': { title: 'legal.privacy.meta.title', description: 'legal.privacy.meta.description' },
  '/terms': { title: 'legal.terms.meta.title', description: 'legal.terms.meta.description' },
  '/refunds': { title: 'legal.refunds.meta.title', description: 'legal.refunds.meta.description' },
}

function message(key: string): string {
  const value = key.split('.').reduce<unknown>(
    (value, part) => (value as Record<string, unknown>)?.[part],
    en,
  )
  if (typeof value !== 'string') {
    throw new Error(`Expected a string for message key: ${key}`)
  }
  return value
}

// llms.txt (llmstxt.org) index of English public pages, built from the sitemap route list and each page's existing meta description.
export function GET(): Response {
  const body = [
    '# WCPOS',
    '',
    `> ${en.home.meta.description}`,
    '',
    '## Pages',
    '',
    ...marketingRoutes.map((route) => {
      const keys = pageMessageKeys[route.path]
      const title = message(keys.title)
      const description = message(keys.description) || title
      return `- [${title}](${localeUrl('en', route.path)}): ${description}`
    }),
    '',
    '## Docs',
    '',
    '- [docs.wcpos.com](https://docs.wcpos.com)',
    '',
  ].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
