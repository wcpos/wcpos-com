import { test, expect } from '@playwright/test'

test.describe('Pro Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pro')
  })

  test('displays WooCommerce POS Pro heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'WooCommerce POS Pro' })
    ).toBeVisible()
  })

  test('displays product pricing cards', async ({ page }) => {
    // Wait for products to load (Suspense will show skeleton first)
    // Should see at least one pricing card with "Get Started" button
    const pricingCard = page.locator('[data-testid="pricing-card"]').first()

    // Wait for card to appear (with reasonable timeout for API call)
    await expect(pricingCard).toBeVisible({ timeout: 10000 })
  })

  test('does NOT show "pricing unavailable" message when products exist', async ({
    page,
  }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // The error message should NOT be visible if products are fetched correctly
    const errorMessage = page.getByText(
      'Pricing information is currently unavailable'
    )

    // Give time for the Suspense to resolve
    await page.waitForTimeout(2000)

    // This is the critical test - if we see this message, the API is broken
    await expect(errorMessage).not.toBeVisible()
  })

  test('displays yearly and lifetime products', async ({ page }) => {
    // Wait for products to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Should see both product types
    await expect(page.getByText('WCPOS Pro Yearly')).toBeVisible()
    await expect(page.getByText('WCPOS Pro Lifetime')).toBeVisible()
  })

  test('pricing cards have Get Started buttons', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const getStartedButtons = page.getByRole('link', { name: 'Get Started' })
    await expect(getStartedButtons.first()).toBeVisible()
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
})
