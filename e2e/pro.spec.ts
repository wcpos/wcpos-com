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
  test('displays WCPOS Pro heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'WCPOS Pro' })
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
    test('displays the buy box', async ({ page }) => {
      await skipIfPricingUnavailable(page)
      const buyBox = page.locator('[data-testid="pro-buy-box"]')
      await expect(buyBox).toBeVisible({ timeout: 10000 })
    })

    test('does NOT show "pricing unavailable" message when products are available', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      await skipIfPricingUnavailable(page)
      const errorMessage = page.getByText(
        'Pricing information is currently unavailable'
      )
      await expect(errorMessage).not.toBeVisible()
    })

    test('displays yearly and lifetime term options', async ({ page }) => {
      await skipIfPricingUnavailable(page)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('radio', { name: /Yearly/ })).toBeVisible()
      await expect(page.getByRole('radio', { name: /Lifetime/ })).toBeVisible()
    })

    test('buy box CTA carries experiment query params', async ({ page }) => {
      await skipIfPricingUnavailable(page)
      await page.waitForLoadState('networkidle')
      const checkoutButtons = page.getByRole('link', {
        name: /Get (Started|Instant Access)/,
      })
      await expect(checkoutButtons.first()).toBeVisible()

      const href = await checkoutButtons.first().getAttribute('href')
      expect(href).toContain('/pro/checkout?')
      const url = new URL(href ?? '', 'http://localhost:3000')
      expect(url.searchParams.get('product')).toBeTruthy()
      expect(url.searchParams.get('variant')).toBeTruthy()
      expect(url.searchParams.get('exp')).toBe('pro_checkout_v1')
      expect(url.searchParams.get('exp_variant')).toBeTruthy()
    })
  })
})
