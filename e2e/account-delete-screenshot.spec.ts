import { test, expect } from '@playwright/test'
import { signInAs } from './helpers/checkout'

// Not a regression test — captures PR screenshots of the danger zone and
// confirm dialog. Kept skipped in normal runs; enable with SCREENSHOTS=1.
test.describe('Account deletion screenshots', () => {
  test.skip(() => !process.env.SCREENSHOTS, 'screenshot capture only')

  test('capture danger zone and dialog', async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL, 'e2e-none__screenshot')
    await page.goto('/account/profile')

    const dangerButton = page.getByRole('button', { name: 'Delete account…' })
    await expect(dangerButton).toBeVisible({ timeout: 15000 })
    await page.screenshot({
      path: 'test-results/screenshots/profile-danger-zone.png',
      fullPage: true,
    })

    const dialog = page.getByRole('dialog')
    await expect(async () => {
      await dangerButton.click()
      await expect(dialog).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
    await dialog.getByRole('textbox').fill('nolicense@example.com')
    await expect(
      dialog.getByRole('button', { name: 'Permanently delete' })
    ).toBeEnabled()
    await page.screenshot({
      path: 'test-results/screenshots/delete-dialog-armed.png',
    })
  })
})
