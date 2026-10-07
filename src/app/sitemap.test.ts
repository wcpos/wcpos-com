import { beforeAll, describe, it, expect, vi } from 'vitest'
import type { MetadataRoute } from 'next'
import sitemap from './sitemap'
import { locales } from '@/i18n/config'
import { PRIVACY_UPDATED_AT, TERMS_UPDATED_AT, REFUNDS_UPDATED_AT } from '@/lib/legal-dates'
import { getReleases } from '@/services/core/external/github-client'
import type { GitHubReleaseInfo } from '@/types/github'

vi.mock('@/services/core/external/github-client', () => ({
  getReleases: vi.fn(async () => [
    {
      tagName: '1.9.0',
      name: 'Draft release',
      body: '',
      publishedAt: '2026-10-01T00:00:00Z',
      draft: true,
      prerelease: false,
      assets: [],
    },
    {
      tagName: '1.8.0-beta.1',
      name: 'Prerelease',
      body: '',
      publishedAt: '2026-09-30T12:00:00Z',
      draft: false,
      prerelease: true,
      assets: [],
    },
    {
      tagName: '1.7.0',
      name: 'Latest published release',
      body: '',
      publishedAt: '2026-09-30T08:00:00Z',
      draft: false,
      prerelease: false,
      assets: [],
    },
    {
      tagName: '1.6.0',
      name: 'Older published release',
      body: '',
      publishedAt: '2026-08-01T00:00:00Z',
      draft: false,
      prerelease: false,
      assets: [],
    },
  ] satisfies GitHubReleaseInfo[]),
}))

describe('sitemap', () => {
  let entries: MetadataRoute.Sitemap

  beforeAll(async () => {
    entries = await sitemap()
  })

  it('contains every marketing route for every locale', () => {
    // 18 marketing routes x 10 locales
    expect(entries).toHaveLength(19 * locales.length)
    const urls = entries.map((entry) => entry.url)
    expect(urls).toContain('https://wcpos.com')
    expect(urls).toContain('https://wcpos.com/downloads')
    expect(urls).toContain('https://wcpos.com/pro')
    expect(urls).toContain('https://wcpos.com/extensions')
    expect(urls).toContain('https://wcpos.com/de/extensions')
    expect(urls).toContain('https://wcpos.com/compare')
    expect(urls).toContain('https://wcpos.com/compare/oliver-pos')
    expect(urls).toContain('https://wcpos.com/fr/compare/oliver-pos')
    expect(urls).toContain('https://wcpos.com/compare/woocommerce-pos')
    expect(urls).toContain('https://wcpos.com/de/compare/woocommerce-pos')
    expect(urls).toContain('https://wcpos.com/compare/square')
    expect(urls).toContain('https://wcpos.com/de/compare/square')
    expect(urls).toContain('https://wcpos.com/compare/jovvie')
    expect(urls).toContain('https://wcpos.com/de/compare/jovvie')
    expect(urls).toContain('https://wcpos.com/compare/vitepos')
    expect(urls).toContain('https://wcpos.com/de/compare/vitepos')
    expect(urls).toContain('https://wcpos.com/compare/yith-pos')
    expect(urls).toContain('https://wcpos.com/de/compare/yith-pos')
    expect(urls).toContain('https://wcpos.com/compare/foosales')
    expect(urls).toContain('https://wcpos.com/de/compare/foosales')
    expect(urls).toContain('https://wcpos.com/about-us')
    expect(urls).toContain('https://wcpos.com/support')
    expect(urls).toContain('https://wcpos.com/fr/roadmap')
    expect(urls).toContain('https://wcpos.com/changelog')
    expect(urls).toContain('https://wcpos.com/fr/changelog')
    expect(urls).toContain('https://wcpos.com/privacy')
    expect(urls).toContain('https://wcpos.com/terms')
    expect(urls).toContain('https://wcpos.com/de/refunds')
  })

  it('excludes private routes', () => {
    const urls = entries.map((entry) => entry.url)
    for (const url of urls) {
      expect(url).not.toMatch(/account|login|register|checkout|\/api\//)
    }
  })

  it('includes hreflang alternates with x-default on every entry', () => {
    for (const entry of entries) {
      const languages = entry.alternates?.languages as Record<string, string>
      expect(languages).toBeDefined()
      expect(languages['x-default']).toBeDefined()
      expect(Object.keys(languages)).toHaveLength(locales.length + 1)
    }
  })

  it('gives routes their own lastmod values, never the clock', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2031-01-01T00:00:00Z'))
      const result = await sitemap()
      const values = result.map((entry) => entry.lastModified)
        .filter((value) => value !== undefined)
      expect(new Set(values).size).toBeGreaterThan(1)
      for (const value of values) {
        expect(String(value)).not.toBe('2031-01-01T00:00:00Z')
        expect(new Date(value).getTime()).not.toBe(Date.now())
        expect(String(value).startsWith('2031')).toBe(false)
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('takes dates from the legal pages and the newest published release', () => {
    for (const [url, date] of [
      ['https://wcpos.com/privacy', PRIVACY_UPDATED_AT],
      ['https://wcpos.com/terms', TERMS_UPDATED_AT],
      ['https://wcpos.com/de/refunds', REFUNDS_UPDATED_AT],
      ['https://wcpos.com/changelog', '2026-09-30T08:00:00Z'],
      ['https://wcpos.com/fr/changelog', '2026-09-30T08:00:00Z'],
      ['https://wcpos.com/downloads', '2026-09-30T08:00:00Z'],
      ['https://wcpos.com/compare/oliver-pos', '2026-10-05'],
    ]) {
      expect(entries.find((entry) => entry.url === url)?.lastModified).toBe(date)
    }
  })

  it('omits lastmod where no real date exists', async () => {
    for (const entry of entries.filter((entry) => entry.url.endsWith('/roadmap'))) {
      expect(entry).not.toHaveProperty('lastModified')
    }
    vi.mocked(getReleases).mockResolvedValueOnce([])
    const result = await sitemap()
    expect(result).toHaveLength(19 * locales.length)
    for (const entry of result.filter((entry) => /\/(changelog|downloads)$/.test(entry.url))) {
      expect(entry).not.toHaveProperty('lastModified')
    }
  })
})
