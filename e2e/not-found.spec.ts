import { test, expect } from '@playwright/test'

/**
 * Unknown-URL handling, in particular dotted paths (/nonexistent.xyz).
 *
 * Paths containing a dot are excluded from the middleware matcher, so they
 * reach the app router without a locale prefix and land in the [locale]
 * segment with an invalid locale (e.g. locale="nonexistent.xyz"). The
 * [locale] layout must tolerate that (resolveLayoutLocale) and let the
 * group layouts/pages reject it inside the [locale]/not-found.tsx boundary.
 *
 * Regression: with cacheComponents, a notFound() thrown from the [locale]
 * layout itself is NOT caught by the root not-found boundary in production
 * builds — the request 500s with an escaped NEXT_HTTP_ERROR_FALLBACK;404
 * digest. These tests run against a production build (`pnpm build && pnpm
 * start`, see playwright.config.ts), which is the only place the bug
 * reproduces; dev-mode renders returned 404 even before the fix.
 */
test.describe('404 handling for unknown URLs', () => {
  test('dotted path misses return a styled 404, not a 500', async ({
    request,
  }) => {
    const response = await request.get('/nonexistent.xyz')

    expect(response.status()).toBe(404)
    const body = await response.text()
    expect(body).toContain('Page not found')
    expect(body).not.toContain('Internal Server Error')
  })

  test('nested dotted paths return 404', async ({ request }) => {
    for (const path of ['/foo/bar.txt', '/a/b/c.xyz', '/en/missing.png']) {
      const response = await request.get(path)
      expect(response.status(), `${path} should 404`).toBe(404)
    }
  })

  test('unknown extension-less path under a valid locale returns the localized 404', async ({
    page,
  }) => {
    const response = await page.goto('/de/does-not-exist')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { name: 'Seite nicht gefunden' })
    ).toBeVisible()
  })

  test('invalid locale prefix without a dot returns 404', async ({
    request,
  }) => {
    const response = await request.get('/xx/does-not-exist')

    expect(response.status()).toBe(404)
  })

  test('the homepage still renders', async ({ request }) => {
    const response = await request.get('/')

    expect(response.status()).toBe(200)
  })
})
