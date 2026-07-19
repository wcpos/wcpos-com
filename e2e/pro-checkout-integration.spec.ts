import { test, expect } from '@playwright/test'
import { completeBillingStep } from './helpers/checkout'

const externalBaseUrl = process.env.BASE_URL?.trim()

test.describe('Checkout Integration @integration', {
  tag: '@integration',
}, () => {
  test.setTimeout(120_000)
  const e2eEmail = process.env.E2E_TEST_EMAIL
  const e2ePassword = process.env.E2E_TEST_PASSWORD
  const medusaApiKey = process.env.MEDUSA_API_KEY

  test.skip(
    !externalBaseUrl && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'Stripe test key is required when Playwright starts the app locally'
  )

  test.skip(
    !e2eEmail || !e2ePassword,
    'E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required for authenticated checkout'
  )

  test.skip(
    !medusaApiKey,
    'MEDUSA_API_KEY is required to verify the purchase creates a license before download'
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
    const getStartedLink = page
      .getByRole('link', { name: /Get (Started|Instant Access)/ })
      .first()
    await expect(getStartedLink).toBeVisible({ timeout: 15000 })
    await getStartedLink.click()

    // Wait for the stepper checkout to load — account is collapsed for the
    // signed-in test user, billing is active.
    await expect(page.getByTestId('checkout-steps')).toBeVisible({
      timeout: 30000,
    })

    // Billing address step (shared helper — same fields as the mocked suite)
    await completeBillingStep(page, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Analytical Engines ApS',
      addressLine1: 'Vesterbrogade 1',
      city: 'København V',
      postalCode: '1620',
      countryCode: 'dk',
      taxNumber: 'DK12345678',
    })

    // Payment step: Card is the default selected method.
    await expect(page.getByTestId('payment-method-stripe')).toHaveAttribute(
      'aria-checked',
      'true',
      { timeout: 15000 }
    )

    // Wait for Stripe Elements to load
    const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first()
    await expect(stripeFrame.locator('[name="number"]')).toBeVisible({ timeout: 30000 })

    // Fill Stripe test card
    await stripeFrame.locator('[name="number"]').fill('4242424242424242')
    await stripeFrame.locator('[name="expiry"]').fill('12/30')
    await stripeFrame.locator('[name="cvc"]').fill('123')

    // Submit payment (the card form's "Pay $X" button, not "Pay with Bitcoin")
    const payButton = page.getByRole('button', { name: /^Pay \$/ })
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

    const orderResponse = await request.get(
      `${medusaUrl}/admin/orders/${orderId}?fields=*fulfillments,*payment_collections.payments,metadata,*billing_address`,
      { headers: { Authorization: `Bearer ${medusaApiKey}` } }
    )

    expect(orderResponse.ok()).toBeTruthy()
    const { order } = await orderResponse.json()

    // Verify payment was captured
    expect(order.payment_status).toBe('captured')

    // Verify the purchase-time billing snapshot, including the intentionally
    // blank region, rather than any later customer-profile state.
    expect(order.billing_address).toMatchObject({
      company: 'Analytical Engines ApS',
      first_name: 'Ada',
      last_name: 'Lovelace',
      address_1: 'Vesterbrogade 1',
      city: 'København V',
      postal_code: '1620',
      country_code: 'dk',
    })
    expect([null, '']).toContain(order.billing_address.province)
    expect(order.metadata?.taxNumber).toBe('DK12345678')

    // Verify order was fulfilled (digital auto-fulfillment)
    expect(['fulfilled', 'delivered']).toContain(order.fulfillment_status)

    // Verify license key was generated for the order created by this test.
    const licenses = order.metadata?.licenses
    expect(Array.isArray(licenses)).toBe(true)
    if (!Array.isArray(licenses)) return
    expect(licenses.length).toBeGreaterThanOrEqual(1)
    expect(licenses[0].license_key).toBeTruthy()

    // ── Download verification ───────────────────────────────
    // The buyer can immediately download the Pro plugin they just paid for.
    // page.request shares the authenticated medusa-token cookie set above.
    const tokenResponse = await page.request.post('/api/account/downloads/token', {
      data: { version: 'latest' },
    })
    expect(tokenResponse.ok()).toBeTruthy()
    const { downloadUrl } = await tokenResponse.json()
    expect(downloadUrl).toContain('/api/account/download?token=')

    // Follow the signed URL and confirm the actual asset streams back.
    const fileResponse = await page.request.get(downloadUrl)
    expect(fileResponse.ok()).toBeTruthy()
    expect(fileResponse.headers()['content-type']).toContain('application/zip')
    expect(fileResponse.headers()['content-disposition']).toContain('attachment')
  })
})
