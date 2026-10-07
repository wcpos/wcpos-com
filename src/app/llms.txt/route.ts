import { llmsPages } from '@/lib/llms-pages'
import { localeUrl } from '@/lib/seo'
import en from '../../../messages/en.json'

// llms.txt (llmstxt.org) index of English public pages, built from the sitemap route list and each page's existing meta description.
export function GET(): Response {
  const body = [
    '# WCPOS',
    '',
    `> ${en.home.meta.description}`,
    '',
    '## Pages',
    '',
    ...llmsPages.map((page) => `- [${page.title}](${page.url}): ${page.description}`),
    '',
    '## Docs',
    '',
    '- [docs.wcpos.com](https://docs.wcpos.com)',
    '',
    '## Optional',
    '',
    `- [llms-full.txt](${localeUrl('en', '/llms-full.txt')})`,
    '',
  ].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
