import { test, expect } from '@playwright/test'

test.describe('Pro Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pro')
  })

  // Static content tests - always run
  test('displays WooCommerce POS Pro heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'WooCommerce POS Pro' })
    ).toBeVisible()
  })

  test('displays features section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: "What's included in Pro?" })
    ).toBeVisible()
  })

  test('displays FAQ section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Frequently Asked Questions' })
    ).toBeVisible()
  })

  test.describe('Product Display', () => {
    test('displays product pricing cards', async ({ page }) => {
      const pricingCard = page.locator('[data-testid="pricing-card"]').first()
      await expect(pricingCard).toBeVisible({ timeout: 10000 })
    })

    test('does NOT show "pricing unavailable" message', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      const errorMessage = page.getByText(
        'Pricing information is currently unavailable'
      )
      await page.waitForTimeout(2000)
      await expect(errorMessage).not.toBeVisible()
    })

    test('displays yearly and lifetime products', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      await expect(page.getByText('WCPOS Pro Yearly')).toBeVisible()
      await expect(page.getByText('WCPOS Pro Lifetime')).toBeVisible()
    })

    test('pricing cards have Get Started buttons', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const getStartedButtons = page.getByRole('link', { name: 'Get Started' })
      await expect(getStartedButtons.first()).toBeVisible()
    })
  })
})
