import { test, expect } from '@playwright/test'
import { signInAs } from './helpers/checkout'

/**
 * Self-service account deletion from the profile danger zone.
 *
 * Uses a suffixed persona token so the deletion (which kills the token in
 * the mock backend) never bleeds into other specs sharing the base persona.
 */
test.describe('Account deletion', () => {
  test('deletes the account, signs out, and the session is dead', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    // Suffix carries the project name: browser projects run in parallel
    // against ONE mock server, and deletion kills the exact token used —
    // a shared token would sign the other browsers out mid-test.
    await signInAs(
      context,
      baseURL,
      `e2e-none__account-delete-${testInfo.project.name}`
    )

    await page.goto('/account/profile')
    const dangerButton = page.getByRole('button', { name: 'Delete account…' })
    await expect(dangerButton).toBeVisible({ timeout: 15000 })

    // The button is server-rendered before React hydrates its handler —
    // retry the click until the dialog actually opens (WebKit is fastest
    // to click and slowest to hydrate).
    const dialog = page.getByRole('dialog')
    await expect(async () => {
      await dangerButton.click()
      await expect(dialog).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
    const confirm = dialog.getByRole('button', { name: 'Permanently delete' })

    // Disarmed until the typed email matches the account email.
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('textbox').fill('someone-else@example.com')
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('textbox').fill('nolicense@example.com')
    await expect(confirm).toBeEnabled()

    await confirm.click()

    // Success is a FULL page load to the homepage as a signed-out visitor.
    await page.waitForURL((url) => new URL(url).pathname === '/', {
      timeout: 15000,
    })

    // The session cookie is gone and the token is dead: the account area
    // bounces to login instead of rendering.
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/login/, { timeout: 15000 })
  })

  test('does not render the delete flow to signed-out visitors', async ({
    page,
  }) => {
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/login/, { timeout: 15000 })
  })
})
