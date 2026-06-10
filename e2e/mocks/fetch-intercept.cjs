'use strict'

/**
 * Preloaded into the Next.js server process via NODE_OPTIONS="--require ...".
 *
 * Rewrites outbound server-side fetches to the external backends (Medusa,
 * Keygen, GitHub) to the local e2e mock server (e2e/mocks/server.mjs) so the
 * default Playwright suite requires NO external services. Playwright's
 * page.route() cannot intercept these because account pages and API routes
 * fetch server-side.
 *
 * Only active when E2E_MOCK_PORT is set (Playwright sets it; production
 * never does). This file must load before Next.js patches global fetch,
 * which NODE_OPTIONS --require guarantees.
 */
const port = process.env.E2E_MOCK_PORT

if (port && typeof globalThis.fetch === 'function') {
  const MOCK_ORIGIN = `http://127.0.0.1:${port}`
  const MOCKED_ORIGINS = new Set([
    'https://store-api.wcpos.com',
    'https://license.wcpos.com',
    'https://api.github.com',
    'https://uploads.github.com',
    'https://objects.githubusercontent.com',
  ])

  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = function e2eMockFetch(input, init) {
    let url = null
    try {
      if (typeof input === 'string' || input instanceof URL) {
        url = new URL(String(input))
      } else if (input && typeof input.url === 'string') {
        url = new URL(input.url)
      }
    } catch {
      // Relative URL or non-standard input: pass through untouched.
    }

    if (url && MOCKED_ORIGINS.has(url.origin)) {
      const rewritten = `${MOCK_ORIGIN}${url.pathname}${url.search}`
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(rewritten, init)
      }
      return originalFetch(new Request(rewritten, input), init)
    }

    return originalFetch(input, init)
  }
}
