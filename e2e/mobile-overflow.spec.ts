import { test, expect } from '@playwright/test'

/**
 * Narrow-phone guard: long translated words must never make a page scroll
 * sideways. 375px is the iPhone SE / mini width the site is audited at.
 * English is unprefixed (localePrefix: 'as-needed' in src/i18n/routing.ts).
 */
const VIEWPORT_WIDTH = 375
const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt', 'zh']
const PAGES = ['/', '/pro', '/refunds', '/roadmap', '/support']

function localePath(locale: string, path: string) {
  if (locale === 'en') return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

test.describe('No horizontal overflow at 375px', () => {
  test.use({ viewport: { width: VIEWPORT_WIDTH, height: 812 } })

  for (const locale of LOCALES) {
    for (const path of PAGES) {
      const url = localePath(locale, path)

      test(`${url} fits the viewport`, async ({ page }) => {
        await page.goto(url, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)

        const { scrollWidth, clippedHeadings } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clippedHeadings: Array.from(document.querySelectorAll('h1'))
            .filter((h1) => h1.scrollWidth > h1.clientWidth)
            .map((h1) => h1.textContent?.trim() ?? ''),
        }))

        expect(scrollWidth).toBeLessThanOrEqual(VIEWPORT_WIDTH)
        expect(clippedHeadings).toEqual([])
      })
    }
  }
})
