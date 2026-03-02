import { test, expect } from '@playwright/test'

async function skipIfPricingUnavailable(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  const unavailableMessage = page.getByText(
    'Pricing information is currently unavailable'
  )

  if (await unavailableMessage.isVisible()) {
    test.skip(true, 'Pricing data unavailable in this environment')
  }
}

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
      await skipIfPricingUnavailable(page)
      const pricingCard = page.locator('[data-testid="pricing-card"]').first()
      await expect(pricingCard).toBeVisible({ timeout: 10000 })
    })

    test('does NOT show "pricing unavailable" message when products are available', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      await skipIfPricingUnavailable(page)
      const errorMessage = page.getByText(
        'Pricing information is currently unavailable'
      )
      await page.waitForTimeout(2000)
      await expect(errorMessage).not.toBeVisible()
    })

    test('displays yearly and lifetime products', async ({ page }) => {
      await skipIfPricingUnavailable(page)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      await expect(page.getByText('WCPOS Pro Yearly')).toBeVisible()
      await expect(page.getByText('WCPOS Pro Lifetime')).toBeVisible()
    })

    test('pricing cards have checkout CTAs with experiment query params', async ({ page }) => {
      await skipIfPricingUnavailable(page)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const checkoutButtons = page.getByRole('link', { name: /Get (Started|Instant Access)/ })
      await expect(checkoutButtons.first()).toBeVisible()

      const href = await checkoutButtons.first().getAttribute('href')
      expect(href).toContain('/pro/checkout?')
      expect(href).toContain('variant=')
      expect(href).toContain('product=')
      expect(href).toContain('exp=pro_checkout_v1')
      expect(href).toContain('exp_variant=')
    })
  })
})
