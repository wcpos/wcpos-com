import { test, expect } from '@playwright/test'

test('support page answers a question and shows Discord', async ({ page }) => {
  let releaseAnswer: () => void = () => {}
  const answerGate = new Promise<void>((resolve) => {
    releaseAnswer = resolve
  })

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('**/api/support/ask', async (route) => {
    await answerGate
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
  await expect(page.getByRole('heading', { level: 1, name: /wcpos for woocommerce: help & support/i })).toBeVisible()

  await page.getByRole('textbox').pressSequentially('How do I print receipts?')
  await page.getByRole('button', { name: /^ask$/i }).click()

  await expect(page.getByText('How do I print receipts?')).toBeVisible()
  const thinking = page.getByRole('status').filter({ hasText: 'Aide is writing…' })
  await expect(thinking).toBeVisible()
  await expect(thinking.locator('p')).not.toHaveCSS('animation-name', 'none')

  releaseAnswer()

  await expect(thinking).toBeHidden()
  await expect(page.getByText(/Settings → Printing/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /talk to a person/i })).toBeVisible()
})
