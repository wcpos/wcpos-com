// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { linkCheckSeeds } from '../../scripts/link-check-seeds.mjs'

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://wcpos.com/</loc>
    <xhtml:link rel="alternate" hreflang="de" href="https://wcpos.com/de"/>
  </url>
  <url><loc> https://wcpos.com/fr/pro </loc></url>
  <url><loc>https://wcpos.com/compare?a=1&amp;b=2</loc></url>
</urlset>`

describe('linkCheckSeeds', () => {
  it('seeds / and every loc on the local origin, preserving order and query strings', () => {
    expect(linkCheckSeeds(fixture)).toEqual([
      { source: '/', url: 'http://localhost:3000/' },
      { source: 'sitemap', url: 'http://localhost:3000/' },
      { source: 'sitemap', url: 'http://localhost:3000/fr/pro' },
      { source: 'sitemap', url: 'http://localhost:3000/compare?a=1&b=2' },
    ])
  })

  it('uses a custom origin for every seed', () => {
    expect(linkCheckSeeds(fixture, 'http://127.0.0.1:4000')).toEqual([
      { source: '/', url: 'http://127.0.0.1:4000/' },
      { source: 'sitemap', url: 'http://127.0.0.1:4000/' },
      { source: 'sitemap', url: 'http://127.0.0.1:4000/fr/pro' },
      { source: 'sitemap', url: 'http://127.0.0.1:4000/compare?a=1&b=2' },
    ])
  })

  it('rejects an empty sitemap or XML without a urlset', () => {
    expect(() => linkCheckSeeds('<urlset></urlset>')).toThrow(/sitemap/)
    expect(() =>
      linkCheckSeeds('<html><loc>https://wcpos.com/</loc></html>'),
    ).toThrow(/sitemap/)
  })

  it('reports CLI errors and separates seed URLs from the seed log', () => {
    const directory = mkdtempSync(join(tmpdir(), 'link-check-seeds-'))
    try {
      const file = join(directory, 'sitemap.xml')
      writeFileSync(file, '<urlset></urlset>')
      const empty = spawnSync(
        process.execPath,
        ['scripts/link-check-seeds.mjs', file],
        { encoding: 'utf8' },
      )
      expect(empty.status).not.toBe(0)
      expect(empty.stderr).toMatch(/sitemap/)

      const missing = spawnSync(
        process.execPath,
        ['scripts/link-check-seeds.mjs', join(directory, 'missing.xml')],
        { encoding: 'utf8' },
      )
      expect(missing.status).not.toBe(0)
      expect(missing.stderr).toMatch(/ENOENT/)

      writeFileSync(file, fixture)
      const result = spawnSync(
        process.execPath,
        ['scripts/link-check-seeds.mjs', file],
        { encoding: 'utf8' },
      )
      expect(result.status).toBe(0)
      expect(result.stdout.trim().split('\n')).toEqual([
        'http://localhost:3000/',
        'http://localhost:3000/',
        'http://localhost:3000/fr/pro',
        'http://localhost:3000/compare?a=1&b=2',
      ])
      expect(result.stderr).toContain('seed (/): http://localhost:3000/')
      expect(result.stderr).toContain('seed (sitemap): http://localhost:3000/fr/pro')
      expect(result.stderr).toContain('4 link-check seeds')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
