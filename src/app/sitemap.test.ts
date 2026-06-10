import { describe, it, expect } from 'vitest'
import sitemap from './sitemap'
import { locales } from '@/i18n/config'

describe('sitemap', () => {
  const entries = sitemap()

  it('contains every marketing route for every locale', () => {
    // 4 marketing routes x 10 locales
    expect(entries).toHaveLength(4 * locales.length)
    const urls = entries.map((entry) => entry.url)
    expect(urls).toContain('https://wcpos.com')
    expect(urls).toContain('https://wcpos.com/pro')
    expect(urls).toContain('https://wcpos.com/support')
    expect(urls).toContain('https://wcpos.com/fr/roadmap')
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
