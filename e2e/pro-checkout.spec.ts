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

async function authenticateCheckout(page: import('@playwright/test').Page) {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  if (!email || !password) {
    return false
  }

  const response = await page.request.post('/api/auth/login', {
    data: { email, password },
  })
  if (!response.ok()) {
    return false
  }

  const setCookieHeader = response.headers()['set-cookie']
  const tokenMatch = setCookieHeader?.match(/medusa-token=([^;]+)/)
  if (!tokenMatch?.[1]) {
    return false
  }

  await page.context().addCookies([
    {
      name: 'medusa-token',
      value: decodeURIComponent(tokenMatch[1]),
      url: 'http://localhost:3000',
    },
  ])

  return true
}

async function setupCheckoutMocks(page: import('@playwright/test').Page) {
  // Mock cart creation
  await page.route('**/api/store/cart', async (route) => {
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
  await page.route('**/api/store/cart/line-items', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cart: mockCart }),
    })
  })

  // Mock payment sessions
  await page.route('**/api/store/cart/payment-sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPaymentResult),
    })
  })
}

test.describe('Checkout Flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    await expect(page).toHaveURL(
      /\/login\?redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_mock_123%26product%3Dwcpos-pro-yearly/
    )
  })

  test('navigates from pro page to checkout', async ({ page }) => {
    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
    await page.goto('/pro')
    await page.waitForLoadState('networkidle')

    const getStartedLink = page.getByRole('link', { name: /Get (Started|Instant Access)/ }).first()
    await expect(getStartedLink).toBeVisible({ timeout: 10000 })

    const href = await getStartedLink.getAttribute('href')
    expect(href).toContain('/pro/checkout')
    expect(href).toContain('variant=')
    expect(href).toContain('exp=pro_checkout_v1')
    expect(href).toContain('exp_variant=')
  })

  test('displays order summary with correct product', async ({ page }) => {
    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
    await setupCheckoutMocks(page)
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('WCPOS Pro Yearly')).toBeVisible()
    await expect(page.getByText('$129.00').first()).toBeVisible()
  })

  test('displays email field', async ({ page }) => {
    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
    await setupCheckoutMocks(page)
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 })
  })

  test('displays payment method tabs', async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, 'Stripe not configured')

    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
    await setupCheckoutMocks(page)
    await page.goto('/pro/checkout?variant=variant_mock_123&product=wcpos-pro-yearly')

    // Wait for checkout to initialize
    await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 10000 })

    // At least the Card tab should appear (Stripe)
    await expect(page.getByRole('tab', { name: /Card/ })).toBeVisible()
  })

  test('shows error when no variant is provided', async ({ page }) => {
    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
    await page.goto('/pro/checkout')

    await expect(page.getByText('No product selected')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /Back to pricing/ }).first()).toBeVisible()
  })

  test('back to pricing link works from checkout', async ({ page }) => {
    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
    await page.goto('/pro/checkout')

    // The page-level back link (not the error state one)
    const backLink = page.getByRole('link', { name: /Back to pricing/ }).first()
    await expect(backLink).toBeVisible()

    await backLink.click()
    await expect(page).toHaveURL(/\/pro$/)
  })

  test('shows error state when cart creation fails', async ({ page }) => {
    test.skip(
      !(await authenticateCheckout(page)),
      'E2E_TEST_EMAIL/E2E_TEST_PASSWORD are required for authenticated checkout tests'
    )
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
