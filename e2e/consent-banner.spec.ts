import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * GDPR analytics consent banner e2e specs.
 *
 * The shared Playwright storageState (playwright.config.ts) pre-seeds a
 * consent decision so the banner stays out of unrelated specs. This file
 * opts back out with an empty storageState to exercise the banner itself.
 *
 * Cookie names must match src/lib/analytics/consent.ts and
 * src/lib/analytics/distinct-id.ts.
 */

const CONSENT_COOKIE = 'wcpos-analytics-consent'
const DISTINCT_ID_COOKIE = 'wcpos-distinct-id'

test.use({ storageState: { cookies: [], origins: [] } })

function banner(page: Page) {
  return page.getByRole('region', { name: 'Cookie consent' })
}

/**
 * Reads cookies via document.cookie in the page. WebKit does not reliably
 * expose document.cookie writes through BrowserContext.cookies(), so cookie
 * assertions go through the page instead.
 */
function documentCookies(page: Page) {
  return page.evaluate(() => document.cookie)
}

test.describe('Consent banner', () => {
  test('shows the banner with a working privacy policy link when undecided', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(banner(page)).toBeVisible()
    await expect(banner(page).getByRole('button', { name: 'Accept' })).toBeVisible()
    await expect(banner(page).getByRole('button', { name: 'Decline' })).toBeVisible()

    const privacyLink = banner(page).getByRole('link', {
      name: 'Privacy policy',
    })
    await expect(privacyLink).toHaveAttribute('href', /\/privacy$/)

    // The legally required privacy policy page must actually exist.
    await privacyLink.click()
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(
      page.getByRole('heading', { name: 'Privacy Policy', level: 1 })
    ).toBeVisible()
  })

  test('accepting stores granted consent and dismisses the banner', async ({
    page,
  }) => {
    await page.goto('/')

    await banner(page).getByRole('button', { name: 'Accept' }).click()
    await expect(banner(page)).toBeHidden()

    expect(await documentCookies(page)).toContain(`${CONSENT_COOKIE}=granted`)

    // The decision persists: no banner on subsequent navigations.
    await page.goto('/pro')
    await expect(banner(page)).toBeHidden()
  })

  test('declining stores denied consent, removes the distinct-id cookie and dismisses the banner', async ({
    page,
    context,
    baseURL,
  }) => {
    // Simulate a stale analytics cookie from before consent was required.
    await context.addCookies([
      {
        name: DISTINCT_ID_COOKIE,
        value: 'e2e-stale-distinct-id',
        url: baseURL ?? 'http://localhost:3000',
      },
    ])

    await page.goto('/')

    await banner(page).getByRole('button', { name: 'Decline' }).click()
    await expect(banner(page)).toBeHidden()

    const cookiesAfterDecline = await documentCookies(page)
    expect(cookiesAfterDecline).toContain(`${CONSENT_COOKIE}=denied`)
    expect(cookiesAfterDecline).not.toContain(DISTINCT_ID_COOKIE)

    // The decision persists: no banner on subsequent navigations.
    await page.goto('/pro')
    await expect(banner(page)).toBeHidden()
  })

  test('does not show the banner when a decision is already stored', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: CONSENT_COOKIE,
        value: 'granted',
        url: baseURL ?? 'http://localhost:3000',
      },
    ])

    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(banner(page)).toBeHidden()
  })
})
