import { test, expect } from '@playwright/test'

test('renders Slot-backed primitives from server components', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()

  await page.goto('/privacy')
  await expect(page.getByRole('link', { name: 'support page' })).toBeVisible()
})
