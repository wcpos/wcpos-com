import { describe, expect, it } from 'vitest'
import { marketingRoutes } from '@/app/sitemap'
import { localeUrl } from '@/lib/seo'
import en from '../../../messages/en.json'
import { GET } from './route'

describe('GET /llms.txt', () => {
  it('serves text/plain', async () => {
    const response = await GET()

    expect(response.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(response.status).toBe(200)
  })

  it('starts with the WCPOS heading and the home meta description', async () => {
    const response = await GET()
    const body = await response.text()

    expect(body.split('\n')[0]).toBe('# WCPOS')
    expect(body).toContain(`> ${en.home.meta.description}`)
  })

  it('links every sitemap page', async () => {
    const response = await GET()
    const body = await response.text()

    for (const route of marketingRoutes) {
      expect(body).toContain(`](${localeUrl('en', route.path)})`)
    }
    const pages = body.split('## Pages\n')[1].split('\n## Docs')[0]
    expect(pages.split('\n').filter((line) => line.startsWith('- ['))).toHaveLength(
      marketingRoutes.length,
    )
  })

  it('lists only sitemap URLs plus the docs site', async () => {
    const response = await GET()
    const body = await response.text()
    const allowedUrls = [
      ...marketingRoutes.map((route) => localeUrl('en', route.path)),
      'https://docs.wcpos.com',
      'https://wcpos.com/llms-full.txt',
    ]

    for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
      expect(allowedUrls).toContain(match[1])
    }
  })

  it('links to /llms-full.txt', async () => {
    const body = await GET().text()

    expect(body).toContain('- [llms-full.txt](https://wcpos.com/llms-full.txt)')
  })

  it('uses each page meta description', async () => {
    const response = await GET()
    const body = await response.text()

    expect(body).toContain(`: ${en.pro.metadata.description}`)
    expect(body).toContain(`: ${en.legal.terms.meta.description}`)
    expect(body).toContain(`: ${en.compare.yith.metadata.description}`)
    expect(body).toContain(`: ${en.compare.foosales.metadata.description}`)
  })
})
