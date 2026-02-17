import { test, expect } from '@playwright/test'

test.describe('Checkout Integration @integration', {
  tag: '@integration',
}, () => {
  test.setTimeout(120_000)
  const e2eEmail = process.env.E2E_TEST_EMAIL
  const e2ePassword = process.env.E2E_TEST_PASSWORD

  test.skip(
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'Stripe test key not configured'
  )

  test.skip(
    !e2eEmail || !e2ePassword,
    'E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required for authenticated checkout'
  )

  test('completes full purchase with Stripe test card', async ({ page, request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: e2eEmail,
        password: e2ePassword,
      },
    })
    expect(loginResponse.ok()).toBeTruthy()

    const setCookieHeader = loginResponse.headers()['set-cookie']
    const tokenMatch = setCookieHeader?.match(/medusa-token=([^;]+)/)
    expect(tokenMatch?.[1]).toBeTruthy()

    await page.context().addCookies([
      {
        name: 'medusa-token',
        value: decodeURIComponent(tokenMatch![1]),
        url: process.env.BASE_URL || 'http://localhost:3000',
      },
    ])

    // Start from pro page
    await page.goto('/pro')
    await page.waitForLoadState('networkidle')

    // Click first "Get Started" button
    const getStartedLink = page.getByRole('link', { name: 'Get Started' }).first()
    await expect(getStartedLink).toBeVisible({ timeout: 15000 })
    await getStartedLink.click()

    // Wait for checkout to load
    await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 30000 })

    // Fill email
    const emailInput = page.getByLabel('Email address')
    if (await emailInput.isEditable()) {
      await emailInput.fill('test-e2e@wcpos.com')
      await emailInput.blur()
    }

    // Wait for Stripe Elements to load
    const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first()
    await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 30000 })

    // Fill Stripe test card
    await stripeFrame.locator('[name="number"]').fill('4242424242424242')
    await stripeFrame.locator('[name="expiry"]').fill('12/30')
    await stripeFrame.locator('[name="cvc"]').fill('123')

    // Submit payment
    const payButton = page.getByRole('button', { name: /Pay/i })
    await expect(payButton).toBeEnabled()
    await payButton.click()

    // Wait for order confirmation
    await expect(page.getByText('Thank you for your purchase')).toBeVisible({ timeout: 60000 })
    await expect(page.getByText('Order ID:')).toBeVisible()

    // Extract the order ID from the page
    const orderIdText = await page.getByText('Order ID:').textContent()
    const orderId = orderIdText?.replace('Order ID:', '').trim()
    expect(orderId).toBeTruthy()

    // ── Backend verification ────────────────────────────────
    // Wait for async processing (license creation, fulfillment)
    await page.waitForTimeout(10_000)

    const medusaUrl = process.env.MEDUSA_BACKEND_URL || 'https://store-api-staging.wcpos.com'

    // Verify order via admin API (requires MEDUSA_API_KEY env var)
    const apiKey = process.env.MEDUSA_API_KEY
    if (apiKey) {
      const orderResponse = await request.get(
        `${medusaUrl}/admin/orders/${orderId}?fields=*fulfillments,*payment_collections.payments,metadata`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      )

      expect(orderResponse.ok()).toBeTruthy()
      const { order } = await orderResponse.json()

      // Verify payment was captured
      expect(order.payment_status).toBe('captured')

      // Verify order was fulfilled (digital auto-fulfillment)
      expect(['fulfilled', 'delivered']).toContain(order.fulfillment_status)

      // Verify license key was generated
      expect(order.metadata?.licenses).toBeDefined()
      expect(order.metadata.licenses.length).toBeGreaterThanOrEqual(1)
      expect(order.metadata.licenses[0].license_key).toBeTruthy()
    }
  })
})
