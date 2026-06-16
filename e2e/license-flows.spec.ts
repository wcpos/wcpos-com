import { test, expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

/**
 * License lifecycle e2e specs (fully mocked — no external services).
 *
 * The Next.js server runs with e2e/mocks/fetch-intercept.cjs preloaded, so
 * all server-side calls to Medusa, Keygen and GitHub are served by
 * e2e/mocks/server.mjs from e2e/mocks/fixtures.json.
 *
 * Auth: the middleware only checks for the presence of the `medusa-token`
 * cookie and the app forwards its value verbatim as a Bearer token, so specs
 * sign in by setting the cookie to a persona key (e.g. "e2e-active"). A
 * `<persona>__<suffix>` token clones the persona's license state in the mock
 * so mutating tests are isolated across parallel workers/projects/retries.
 */

const MOCK_ORIGIN = `http://127.0.0.1:${process.env.E2E_MOCK_PORT || 4873}`

async function signInAs(
  context: BrowserContext,
  baseURL: string | undefined,
  token: string
) {
  await context.addCookies([
    {
      name: 'medusa-token',
      value: token,
      url: baseURL ?? 'http://localhost:3000',
    },
  ])
}

/** A license card on /account/licenses, identified by its masked key. */
function licenseCard(page: Page, maskedKey: string) {
  return page.locator('div.bg-card').filter({ hasText: maskedKey })
}

/** A release row on /account/downloads, identified by its release name. */
function releaseRow(page: Page, releaseName: string) {
  return page
    .locator('[data-testid="release-row"]')
    .filter({ has: page.getByText(releaseName, { exact: true }) })
}

test.describe('Auth gating', () => {
  for (const route of ['/account', '/account/licenses', '/account/downloads']) {
    test(`redirects unauthenticated ${route} to login with redirect param`, async ({
      page,
    }) => {
      await page.goto(route)

      const encoded = encodeURIComponent(route).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )
      await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encoded}`))
    })
  }

  test('license APIs reject unauthenticated requests', async ({ request }) => {
    const licenses = await request.get('/api/account/licenses')
    expect(licenses.status()).toBe(401)

    const downloadToken = await request.post('/api/account/downloads/token', {
      data: { version: 'latest' },
    })
    expect(downloadToken.status()).toBe(401)
  })
})

test.describe('Purchase to account handoff', () => {
  test('after a completed checkout the customer sees their license in the account', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-purchase')

    // Land on the post-checkout success page (checkout completion itself
    // requires real Stripe and is covered by the @integration suite).
    await page.goto('/pro/checkout/success')
    await expect(
      page.getByRole('heading', { name: 'Thank You!' })
    ).toBeVisible()

    await page.getByRole('link', { name: /Go to Licenses/ }).click()
    await expect(page).toHaveURL(/\/account\/licenses/)

    const card = licenseCard(page, '****-****-7777')
    await expect(card).toBeVisible()
    // Status badge renders the lowercased display status (raw Keygen casing is normalized).
    await expect(card.getByText('active', { exact: true })).toBeVisible()
    await expect(card.getByText('Yearly', { exact: true })).toBeVisible()
    await expect(card.getByText('0 of 4')).toBeVisible()
    await expect(card.getByRole('link', { name: /Downloads/ })).toBeVisible()
  })

  test('/account redirects to licenses and reflects the new purchase', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-purchase')
    // The Overview page was removed; /account now redirects to the licenses
    // tab, which is the account landing page.
    await page.goto('/account')

    await expect(page).toHaveURL(/\/account\/licenses/)
    await expect(licenseCard(page, '****-****-7777')).toBeVisible()
  })
})

test.describe('Existing license holder data accuracy', () => {
  test('migrated WordPress holder sees lifetime license and unresolvable legacy key', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-legacy')
    await page.goto('/account/licenses')

    // Lifetime license resolved from the legacy order's license_key.
    const lifetimeCard = licenseCard(page, '****-****-Y007')
    await expect(lifetimeCard).toBeVisible()
    await expect(lifetimeCard.getByText('active', { exact: true })).toBeVisible()
    await expect(
      lifetimeCard.getByText('Lifetime', { exact: true })
    ).toBeVisible()
    await expect(lifetimeCard.getByText('0 of 1')).toBeVisible()
    // Lifetime licenses have no expiry.
    await expect(lifetimeCard.getByText('Expires:')).toHaveCount(0)
    await expect(
      lifetimeCard.getByRole('link', { name: /Downloads/ })
    ).toBeVisible()

    // Legacy key that no longer resolves renders as an unknown placeholder.
    const unknownCard = licenseCard(page, '****-****-0000')
    await expect(unknownCard).toBeVisible()
    await expect(unknownCard.getByText('unknown', { exact: true })).toBeVisible()
    await expect(unknownCard.getByText('0 of 0')).toBeVisible()
    await expect(unknownCard.getByRole('link', { name: /Downloads/ })).toHaveCount(0)
  })

  test('expired holder sees expired status, expiry date, renew CTA, and downloads link', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-expired')
    await page.goto('/account/licenses')

    const card = licenseCard(page, '****-****-5678')
    await expect(card).toBeVisible()
    await expect(card.getByText('expired', { exact: true })).toBeVisible()
    await expect(card.getByText('Expires:')).toBeVisible()
    await expect(card.getByText(/2025/)).toBeVisible()
    await expect(card.getByText('0 of 1')).toBeVisible()
    // Expired holders can still download pre-expiry versions, so the
    // downloads link stays, alongside a renew CTA.
    const renewLink = card.getByRole('link', { name: 'Renew' })
    await expect(renewLink).toBeVisible()
    await expect(renewLink).toHaveAttribute('href', '/pro')
    await expect(card.getByRole('link', { name: /Downloads/ })).toBeVisible()
  })

  test('suspended holder sees suspended status and no downloads CTA', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-suspended')
    await page.goto('/account/licenses')

    const card = licenseCard(page, '****-****-9012')
    await expect(card).toBeVisible()
    await expect(card.getByText('suspended', { exact: true })).toBeVisible()
    await expect(card.getByRole('link', { name: /Downloads/ })).toHaveCount(0)
  })

  test('customer without purchases sees the empty state', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-none')
    await page.goto('/account/licenses')

    await expect(page.getByText('No licenses found.')).toBeVisible()
  })
})

test.describe('License activation and machine deactivation', () => {
  test('machine activated by the POS plugin appears in the account and can be deactivated', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    // Unique suffix isolates this test's license state in the mock backend.
    const suffix = `act-${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`
    await signInAs(context, baseURL, `e2e-active__${suffix}`)

    await page.goto('/account/licenses')
    const card = licenseCard(page, '****-****-1234')
    await expect(card.getByText('2 of 4')).toBeVisible()
    await expect(card.getByText('Front Counter POS')).toBeVisible()
    await expect(card.getByText('Back Office Mac')).toBeVisible()

    // Simulate the POS plugin activating a third machine against the
    // license server (activation happens plugin-side, not in the account UI;
    // the app's /api/test/license harness is disabled under `next start`).
    const activation = await page.request.post(
      `${MOCK_ORIGIN}/v1/licenses/lic-e2e-active__${suffix}/machines`,
      {
        headers: { 'Content-Type': 'application/vnd.api+json' },
        data: {
          data: {
            type: 'machines',
            attributes: {
              fingerprint: 'fp-till-003',
              name: 'Till 3',
              metadata: { domain: 'till3.example.com' },
            },
          },
        },
      }
    )
    expect(activation.status()).toBe(201)

    // The account UI reflects the new activation.
    await page.reload()
    await expect(card.getByText('3 of 4')).toBeVisible()
    await expect(card.getByText('Till 3')).toBeVisible()

    // Deactivate it from the account UI.
    await card.getByRole('button', { name: 'Deactivate Till 3' }).click()
    await expect(card.getByText('2 of 4')).toBeVisible()
    await expect(card.getByText('Till 3')).toHaveCount(0)
    await expect(card.getByText('Front Counter POS')).toBeVisible()
    await expect(card.getByText('Back Office Mac')).toBeVisible()
  })

  test('deactivating a machine from the account UI updates the activation count', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const suffix = `deact-${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`
    await signInAs(context, baseURL, `e2e-active__${suffix}`)

    await page.goto('/account/licenses')
    const card = licenseCard(page, '****-****-1234')
    await expect(card.getByText('2 of 4')).toBeVisible()

    await card
      .getByRole('button', { name: 'Deactivate Back Office Mac' })
      .click()

    await expect(card.getByText('1 of 4')).toBeVisible()
    await expect(card.getByText('Back Office Mac')).toHaveCount(0)
    await expect(card.getByText('Front Counter POS')).toBeVisible()
  })

  test('cannot deactivate machines on a license the customer does not own', async ({
    page,
    context,
    baseURL,
  }) => {
    // e2e-purchase owns lic-e2e-purchase only.
    await signInAs(context, baseURL, 'e2e-purchase')
    await page.goto('/account')

    const response = await page.request.delete(
      '/api/account/licenses/lic-e2e-active/machines/mach-e2e-front-counter'
    )
    expect(response.status()).toBe(403)
  })
})

test.describe('Expired license version gating in downloads', () => {
  test('releases published after expiry are not downloadable and the UI reflects it', async ({
    page,
    context,
    baseURL,
  }) => {
    // e2e-expired's license expired 2025-06-15. v3.2.0 (2026-01-15) is
    // post-expiry; v2.5.0 (2025-05-01) and v1.9.0 (2024-11-01) are not.
    await signInAs(context, baseURL, 'e2e-expired')
    await page.goto('/account/downloads')

    // Post-expiry releases are greyed out with an explicit reason and an
    // "Unavailable" button; the page banner offers a renew CTA.
    const blockedRow = releaseRow(page, 'WCPOS Pro 3.2.0')
    await expect(
      blockedRow.getByRole('button', { name: 'Unavailable' })
    ).toBeDisabled()
    await expect(
      blockedRow.getByText('Released after your license expired.')
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Renew license' })
    ).toHaveAttribute('href', '/pro')
    await expect(
      releaseRow(page, 'WCPOS Pro 2.5.0').getByRole('button', {
        name: 'Download',
      })
    ).toBeEnabled()
    await expect(
      releaseRow(page, 'WCPOS Pro 1.9.0').getByRole('button', {
        name: 'Download',
      })
    ).toBeEnabled()

    // Server-side enforcement, not just disabled buttons.
    const forbidden = await page.request.post('/api/account/downloads/token', {
      data: { version: '3.2.0' },
    })
    expect(forbidden.status()).toBe(403)

    const allowed = await page.request.post('/api/account/downloads/token', {
      data: { version: '2.5.0' },
    })
    expect(allowed.status()).toBe(200)
    const payload = await allowed.json()
    expect(payload.downloadUrl).toContain('/api/account/download?token=')
  })

  test('pre-expiry release downloads successfully for an expired license', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-expired')
    await page.goto('/account/downloads')

    const downloadPromise = page.waitForEvent('download')
    await releaseRow(page, 'WCPOS Pro 2.5.0')
      .getByRole('button', { name: 'Download' })
      .click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('woocommerce-pos-pro-2.5.0.zip')
  })

  test('active license can download the latest release', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-active')
    await page.goto('/account/downloads')

    const latestRow = releaseRow(page, 'WCPOS Pro 3.2.0')
    await expect(
      latestRow.getByRole('button', { name: 'Download' })
    ).toBeEnabled()

    const downloadPromise = page.waitForEvent('download')
    await latestRow.getByRole('button', { name: 'Download' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('woocommerce-pos-pro-3.2.0.zip')
  })

  test('customer without licenses cannot download anything', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-none')
    await page.goto('/account/downloads')

    // With no license at all, every release is "Unavailable" and the page
    // offers a purchase CTA instead of a renew banner.
    const buttons = page.getByRole('button', { name: 'Unavailable' })
    await expect(buttons).toHaveCount(3)
    for (const button of await buttons.all()) {
      await expect(button).toBeDisabled()
    }
    await expect(
      page.getByRole('link', { name: 'Get WCPOS Pro' })
    ).toHaveAttribute('href', '/pro')

    const response = await page.request.post('/api/account/downloads/token', {
      data: { version: '1.9.0' },
    })
    expect(response.status()).toBe(403)
  })
})
