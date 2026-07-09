import { test, expect } from '@playwright/test'

test('support page answers a question and shows Discord', async ({ page }) => {
  await page.route('**/api/support/ask', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer: 'Open **Settings → Printing**.',
        sessionId: '00000000-0000-0000-0000-000000000000',
      }),
    })
  })

  await page.goto('/en/support')
  await expect(page.getByRole('heading', { name: /how can we help/i })).toBeVisible()

  await page.getByRole('textbox').pressSequentially('How do I print receipts?')
  await page.getByRole('button', { name: /^ask$/i }).click()

  await expect(page.getByText('How do I print receipts?')).toBeVisible()
  await expect(page.getByText(/Settings → Printing/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /talk to a human/i })).toBeVisible()
  // The Discord embed is behind a click-to-load facade — the widget itself
  // (third-party iframe) must NOT mount until requested.
  await expect(page.getByRole('button', { name: /load live chat/i })).toBeVisible()
  await expect(page.locator('iframe[src*="widgetbot"]')).toHaveCount(0)
})
