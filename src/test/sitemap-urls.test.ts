import { describe, it, expect } from 'vitest'
import {
  decodeXmlEntities,
  extractSitemapUrls,
} from '../../scripts/sitemap-urls.mjs'

// Pins the IndexNow payload contract: sitemap <loc> values are XML-escaped
// (`&` must be `&amp;` per sitemaps.org), so URLs must be decoded before
// submission or query strings arrive mangled (`?a=1&amp;b=2`).
describe('extractSitemapUrls', () => {
  it('extracts every <loc> value from sitemap XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset><url><loc>https://wcpos.com/</loc></url>
      <url><loc> https://wcpos.com/pro </loc></url></urlset>`
    expect(extractSitemapUrls(xml)).toEqual([
      'https://wcpos.com/',
      'https://wcpos.com/pro',
    ])
  })

  it('decodes XML entities so query strings survive submission', () => {
    const xml = '<url><loc>https://wcpos.com/pro?a=1&amp;b=2</loc></url>'
    expect(extractSitemapUrls(xml)).toEqual(['https://wcpos.com/pro?a=1&b=2'])
  })

  it('returns an empty list when no <loc> entries exist', () => {
    expect(extractSitemapUrls('<urlset></urlset>')).toEqual([])
  })
})

describe('decodeXmlEntities', () => {
  it('decodes the five XML named references', () => {
    expect(decodeXmlEntities('&amp;&lt;&gt;&quot;&apos;')).toBe('&<>"\'')
  })

  it('decodes decimal and hex character references', () => {
    expect(decodeXmlEntities('&#38;&#x26;&#x2F;')).toBe('&&/')
  })

  it('leaves text without references untouched', () => {
    expect(decodeXmlEntities('https://wcpos.com/pro?a=1')).toBe(
      'https://wcpos.com/pro?a=1',
    )
  })
})
