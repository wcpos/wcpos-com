import { test, expect } from '@playwright/test'

// Mock data matching what the API routes return
const mockCart = {
  id: 'cart_mock_123',
  email: null,
  items: [
    {
      id: 'item_1',
      title: 'WCPOS Pro Yearly',
      quantity: 1,
      unit_price: 129,
      total: 129,
    },
  ],
  total: 129,
  currency_code: 'usd',
}

const mockPaymentResult = {
  cart: mockCart,
  paymentCollectionId: 'pay_col_mock_123',
  clientSecret: 'pi_mock_secret_123_secret_mock',
  paymentSessionId: 'payses_mock_123',
}

function setupCheckoutMocks(page: import('@playwright/test').Page) {
  // Mock cart creation
  page.route('**/api/store/cart', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cart: mockCart }),
      })
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cart: { ...mockCart, email: 'test@example.com' } }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock add line item
  page.route('**/api/store/cart/line-items', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cart: mockCart }),
    })
  })

  // Mock payment sessions
  page.route('**/api/store/cart/payment-sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPaymentResult),
    })
  })
}

test.describe('Checkout Flow', () => {
  test('navigates from pro page to checkout', async ({ page }) => {
    await page.goto('/pro')
    await page.waitForLoadState('networkidle')

    const getStartedLink = page.getByRole('link', { name: 'Get Started' }).first()
    await expect(getStartedLink).toBeVisible({ timeout: 10000 })

    const href = await getStartedLink.getAttribute('href')
    expect(href).toContain('/pro/checkout')
    expect(href).toContain('variant=')
  })

  test('displays order summary with correct product', async ({ page }) => {
    setupCheckoutMocks(page)
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('WCPOS Pro Yearly')).toBeVisible()
    await expect(page.getByText('$129.00')).toBeVisible()
  })

  test('displays email field', async ({ page }) => {
    setupCheckoutMocks(page)
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 })
  })

  test('displays payment method tabs', async ({ page }) => {
    setupCheckoutMocks(page)
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    // Wait for checkout to initialize
    await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 10000 })

    // At least the Card tab should appear (Stripe)
    await expect(page.getByRole('tab', { name: /Card/ })).toBeVisible()
  })

  test('shows error when no variant is provided', async ({ page }) => {
    await page.goto('/pro/checkout')

    await expect(page.getByText('No product selected')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /Back to pricing/ })).toBeVisible()
  })

  test('back to pricing link works from checkout', async ({ page }) => {
    await page.goto('/pro/checkout')

    // The page-level back link (not the error state one)
    const backLink = page.getByRole('link', { name: /Back to pricing/ }).first()
    await expect(backLink).toBeVisible()

    await backLink.click()
    await expect(page).toHaveURL(/\/pro$/)
  })

  test('shows error state when cart creation fails', async ({ page }) => {
    // Mock cart creation to fail
    await page.route('**/api/store/cart', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    await expect(page.getByText('Failed to create cart')).toBeVisible({ timeout: 10000 })
  })
})
