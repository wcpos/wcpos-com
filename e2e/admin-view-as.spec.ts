import { test, expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

/**
 * Admin read-only "view as" (impersonation) e2e specs (fully mocked).
 *
 * The e2e-admin persona's email is on the ADMIN_EMAILS allowlist
 * (src/lib/admin.ts), so signing in with its token unlocks /account/admin.
 * Target personas come from e2e/mocks/fixtures.json; the mock serves the
 * Medusa admin lookups (/admin/customers, /admin/orders) the flow uses.
 */

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

async function inspectCustomer(page: Page, email: string) {
  // Scope to the inspect form — the impersonation banner's Exit button is
  // also a form submit when an inspection is already active.
  const form = page.locator('form:has(input[name="email"])')
  await form.locator('input[name="email"]').fill(email)
  await form.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/account\/licenses/)
}

test.describe('Admin view-as', () => {
  test('mock admin routes reject invalid authorization', async ({ request }) => {
    const mockPort = process.env.E2E_MOCK_PORT || '4873'
    const response = await request.get(
      `http://127.0.0.1:${mockPort}/admin/customers`,
      { headers: { Authorization: 'Basic invalid' } }
    )

    expect(response.status()).toBe(401)
  })

  test('inspecting a customer shows their licenses with the read-only banner', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-admin')
    await page.goto('/account/admin')

    await inspectCustomer(page, 'active@example.com')

    await expect(page.getByText('active@example.com')).toBeVisible()
    await expect(licenseCard(page, '****-****-1234')).toBeVisible()
  })

  test('inspecting a second customer after going back shows THAT customer, not the first', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-admin')
    await page.goto('/account/admin')

    // First inspection: the active persona (license ****-****-1234).
    await inspectCustomer(page, 'active@example.com')
    await expect(licenseCard(page, '****-****-1234')).toBeVisible()

    // Back to the admin form, then inspect a DIFFERENT persona.
    await page.goBack()
    await expect(page).toHaveURL(/\/account\/admin/)

    // Second inspection: the expired persona (license ****-****-5678).
    await inspectCustomer(page, 'expired@example.com')

    // The banner and the license list must BOTH describe the new target.
    // Regression: Next keeps revisited pages alive for back/forward
    // navigation, so LicensesClient's prop-seeded useState survived the
    // history revisit and kept showing the PREVIOUS target's licences.
    await expect(page.getByText('expired@example.com')).toBeVisible()
    await expect(licenseCard(page, '****-****-5678')).toBeVisible()
    await expect(licenseCard(page, '****-****-1234')).not.toBeVisible()
  })

  test('switching customers clears preserved delete-account dialog state', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-admin')
    await page.goto('/account/admin')

    await inspectCustomer(page, 'active@example.com')
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page).toHaveURL(/\/account\/profile/)

    const dialog = page.getByRole('dialog')
    await page.getByRole('button', { name: 'Delete account…' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('textbox').fill('active@example.com')

    await page.goBack()
    await expect(page).toHaveURL(/\/account\/licenses/)
    await page.goBack()
    await expect(page).toHaveURL(/\/account\/admin/)

    await inspectCustomer(page, 'expired@example.com')
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page).toHaveURL(/\/account\/profile/)

    await expect(page.getByText('expired@example.com')).toBeVisible()
    await expect(dialog).not.toBeVisible()

    await page.getByRole('button', { name: 'Delete account…' }).click()
    await expect(dialog.getByRole('textbox')).toHaveValue('')
  })
})
