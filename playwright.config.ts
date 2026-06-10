import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */

/**
 * Local mock backend (Medusa + Keygen + GitHub) for the default suite.
 * The Next.js server preloads e2e/mocks/fetch-intercept.cjs so server-side
 * fetches to the external backends are served by e2e/mocks/server.mjs,
 * meaning the default suite requires no external services.
 */
const MOCK_PORT = Number(process.env.E2E_MOCK_PORT || 4873)
const FETCH_INTERCEPT_PATH = path.join(
  __dirname,
  'e2e',
  'mocks',
  'fetch-intercept.cjs'
)
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  // Exclude integration tests by default (run with --grep @integration)
  grepInvert: process.env.INCLUDE_INTEGRATION ? undefined : /@integration/,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run the mock backend and the local app server before starting the tests */
  webServer: [
    {
      command: 'node e2e/mocks/server.mjs',
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        E2E_MOCK_PORT: String(MOCK_PORT),
      },
    },
    {
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 240000,
      // Integration runs (INCLUDE_INTEGRATION=1 --grep @integration) must hit
      // the real backends from ambient env, so the interceptor and host pins
      // apply only to the default mocked suite.
      env: process.env.INCLUDE_INTEGRATION
        ? {}
        : {
            // Preload the fetch interceptor into the Next.js server process so
            // server-side calls to Medusa/Keygen/GitHub hit the mock backend.
            NODE_OPTIONS: `--require ${FETCH_INTERCEPT_PATH}`,
            E2E_MOCK_PORT: String(MOCK_PORT),
            // Pin backend hosts to the origins the interceptor rewrites, in
            // case a local .env.local points elsewhere.
            MEDUSA_BACKEND_URL: 'https://store-api.wcpos.com',
            KEYGEN_HOST: 'license.wcpos.com',
            DOWNLOAD_TOKEN_SECRET: 'e2e-download-token-secret',
          },
    },
  ],
})

