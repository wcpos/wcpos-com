import { describe, it, expect } from 'vitest'
import sitemap from './sitemap'
import { locales } from '@/i18n/config'

describe('sitemap', () => {
  const entries = sitemap()

  it('contains every marketing route for every locale', () => {
    // 18 marketing routes x 10 locales
    expect(entries).toHaveLength(18 * locales.length)
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
})
