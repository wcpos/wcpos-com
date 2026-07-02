import { test, expect } from '@playwright/test'
import {
  MOCK_BACKEND_URL,
  YEARLY_CHECKOUT_PATH,
  completeBillingStep,
  openYearlyCheckout,
  signInAs,
} from './helpers/checkout'

/**
 * Checkout flow e2e specs (fully mocked — no external services, no real
 * credentials).
 *
 * The Next.js server runs with e2e/mocks/fetch-intercept.cjs preloaded, so
 * server-side calls to Medusa (customers, products, carts, payment
 * collections) are served by e2e/mocks/server.mjs. Specs authenticate by
 * setting the `medusa-token` cookie to a persona key (see e2e/mocks/
 * fixtures.json); the app forwards the cookie value verbatim as a Bearer
 * token. Carts are minted per POST with unique ids by the mock, so parallel
 * workers/projects/retries never share cart state.
 *
 * Scope: the three-step checkout (account / billing / payment) up to the
 * payment method selector. Bitcoin (BTCPay) is enabled in the mocked build
 * (plain redirect — no client SDK) and exercised end-to-end in
 * e2e/pro-checkout-journeys.spec.ts. Stripe Elements / PayPal SDK cannot run
 * against a mock backend; card entry and payment confirmation are covered by
 * e2e/pro-checkout-integration.spec.ts (@integration — real backends and
 * real Stripe test keys).
 */

// Persona without licenses — semantically, a customer about to buy.
const CHECKOUT_PERSONA = 'e2e-none'
const CHECKOUT_PERSONA_EMAIL = 'nolicense@example.com'

test.describe('Checkout auth gating', () => {
  test('shows the inline account step instead of redirecting to login', async ({
    page,
  }) => {
    await page.goto(YEARLY_CHECKOUT_PATH)

    // No login bounce — the first step creates the account inline.
    await expect(page).toHaveURL(/\/pro\/checkout\?/)
    await expect(page.getByTestId('account-step-form')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByTestId('checkout-step-1')).toHaveAttribute(
      'data-step-state',
      'active'
    )
  })

  test('cart APIs reject unauthenticated requests', async ({ request }) => {
    const cart = await request.post('/api/store/cart', { data: {} })
    expect(cart.status()).toBe(401)

    const lineItems = await request.post('/api/store/cart/line-items', {
      data: { cartId: 'cart_x', product: 'wcpos-pro-yearly' },
    })
    expect(lineItems.status()).toBe(401)

    const paymentSessions = await request.post(
      '/api/store/cart/payment-sessions',
      { data: { cartId: 'cart_x' } }
    )
    expect(paymentSessions.status()).toBe(401)
  })
})

test.describe('Mock checkout backend', () => {
  test('rejects invalid line-item quantities without mutating the cart', async ({
    request,
  }) => {
    const cartResponse = await request.post(`${MOCK_BACKEND_URL}/store/carts`, {
      data: {},
    })
    expect(cartResponse.status()).toBe(200)
    const { cart } = await cartResponse.json()

    for (const quantity of ['not-a-number', 0, -1, 1.5]) {
      const lineItemResponse = await request.post(
        `${MOCK_BACKEND_URL}/store/carts/${cart.id}/line-items`,
        {
          data: { variant_id: 'variant_e2e_yearly', quantity },
        }
      )
      expect(lineItemResponse.status()).toBe(400)
    }

    const updatedCartResponse = await request.get(
      `${MOCK_BACKEND_URL}/store/carts/${cart.id}`
    )
    expect(updatedCartResponse.status()).toBe(200)
    const { cart: updatedCart } = await updatedCartResponse.json()
    expect(updatedCart.items).toHaveLength(0)
    expect(updatedCart.total).toBe(0)
  })

  test('reuses payment collections per cart without dropping sessions', async ({
    request,
  }) => {
    const cartResponse = await request.post(`${MOCK_BACKEND_URL}/store/carts`, {
      data: {},
    })
    expect(cartResponse.status()).toBe(200)
    const { cart } = await cartResponse.json()

    const lineItemResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/carts/${cart.id}/line-items`,
      {
        data: { variant_id: 'variant_e2e_yearly', quantity: 1 },
      }
    )
    expect(lineItemResponse.status()).toBe(200)

    const paymentCollectionResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/payment-collections`,
      { data: { cart_id: cart.id } }
    )
    expect(paymentCollectionResponse.status()).toBe(200)
    const { payment_collection: paymentCollection } =
      await paymentCollectionResponse.json()

    const sessionResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/payment-collections/${paymentCollection.id}/payment-sessions`,
      { data: { provider_id: 'pp_stripe_stripe' } }
    )
    expect(sessionResponse.status()).toBe(200)
    const { payment_collection: collectionWithSession } =
      await sessionResponse.json()
    expect(collectionWithSession.payment_sessions).toHaveLength(1)

    const retriedCollectionResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/payment-collections`,
      { data: { cart_id: cart.id } }
    )
    expect(retriedCollectionResponse.status()).toBe(200)
    const { payment_collection: retriedCollection } =
      await retriedCollectionResponse.json()
    expect(retriedCollection.id).toBe(paymentCollection.id)
    expect(retriedCollection.payment_sessions).toHaveLength(1)
  })

  test('returns the same order when cart completion is retried', async ({
    request,
  }) => {
    const cartResponse = await request.post(`${MOCK_BACKEND_URL}/store/carts`, {
      data: {},
    })
    expect(cartResponse.status()).toBe(200)
    const { cart } = await cartResponse.json()
    const email = `retry-completion+${cart.id}@example.com`

    const registerResponse = await request.post(
      `${MOCK_BACKEND_URL}/auth/customer/emailpass/register`,
      { data: { email, password: 'e2e-password' } }
    )
    expect(registerResponse.status()).toBe(200)

    // Registration tokens are not sessions (empty actor_id in real Medusa)
    // — exchange for a session token the way the app's register() does.
    const loginResponse = await request.post(
      `${MOCK_BACKEND_URL}/auth/customer/emailpass`,
      { data: { email, password: 'e2e-password' } }
    )
    expect(loginResponse.status()).toBe(200)
    const { token } = await loginResponse.json()

    const emailResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/carts/${cart.id}`,
      { data: { email } }
    )
    expect(emailResponse.status()).toBe(200)

    const lineItemResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/carts/${cart.id}/line-items`,
      {
        data: { variant_id: 'variant_e2e_yearly', quantity: 1 },
      }
    )
    expect(lineItemResponse.status()).toBe(200)

    const paymentCollectionResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/payment-collections`,
      { data: { cart_id: cart.id } }
    )
    expect(paymentCollectionResponse.status()).toBe(200)
    const { payment_collection: paymentCollection } =
      await paymentCollectionResponse.json()

    const sessionResponse = await request.post(
      `${MOCK_BACKEND_URL}/store/payment-collections/${paymentCollection.id}/payment-sessions`,
      { data: { provider_id: 'pp_btcpay_btcpay' } }
    )
    expect(sessionResponse.status()).toBe(200)

    const firstComplete = await request.post(
      `${MOCK_BACKEND_URL}/store/carts/${cart.id}/complete`
    )
    expect(firstComplete.status()).toBe(200)
    const { order: firstOrder } = await firstComplete.json()

    const firstOrdersResponse = await request.get(
      `${MOCK_BACKEND_URL}/store/orders`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(firstOrdersResponse.status()).toBe(200)
    const { count: firstOrderCount, orders: firstOrders } =
      await firstOrdersResponse.json()
    expect(firstOrderCount).toBe(1)
    expect(firstOrders).toHaveLength(1)
    expect(firstOrders[0].id).toBe(firstOrder.id)

    const retriedComplete = await request.post(
      `${MOCK_BACKEND_URL}/store/carts/${cart.id}/complete`
    )
    expect(retriedComplete.status()).toBe(200)
    const { order: retriedOrder } = await retriedComplete.json()

    expect(retriedOrder.id).toBe(firstOrder.id)
    expect(retriedOrder.display_id).toBe(firstOrder.display_id)

    const retriedOrdersResponse = await request.get(
      `${MOCK_BACKEND_URL}/store/orders`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(retriedOrdersResponse.status()).toBe(200)
    const { count: retriedOrderCount, orders: retriedOrders } =
      await retriedOrdersResponse.json()
    expect(retriedOrderCount).toBe(firstOrderCount)
    expect(retriedOrders).toHaveLength(1)
    expect(retriedOrders[0].id).toBe(firstOrder.id)
  })
})

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signInAs(context, baseURL, CHECKOUT_PERSONA)
  })

  test('navigates from pro page to a rendered checkout', async ({ page }) => {
    await page.goto('/pro')

    // Yearly is sorted first and featured, so the first CTA is the yearly one.
    const getStartedLink = page
      .getByRole('link', { name: /Get (Started|Instant Access)/ })
      .first()
    await expect(getStartedLink).toBeVisible({ timeout: 10000 })

    const href = await getStartedLink.getAttribute('href')
    expect(href).toContain('/pro/checkout')
    expect(href).toContain('product=wcpos-pro-yearly')
    expect(href).toContain('variant=variant_e2e_yearly')
    expect(href).toContain('exp=pro_checkout_v1')
    expect(href).toContain('exp_variant=')

    await getStartedLink.click()
    await expect(page).toHaveURL(/\/pro\/checkout\?/)
    await expect(page.getByTestId('checkout-steps')).toBeVisible({
      timeout: 15000,
    })
  })

  test('collapses the account step to the signed-in email', async ({
    page,
  }) => {
    await openYearlyCheckout(page)

    await expect(page.getByTestId('checkout-step-1')).toHaveAttribute(
      'data-step-state',
      'done'
    )
    await expect(page.getByText(CHECKOUT_PERSONA_EMAIL)).toBeVisible()
    await expect(page.getByTestId('checkout-step-2')).toHaveAttribute(
      'data-step-state',
      'active'
    )
  })

  test('displays order summary with the selected product', async ({
    page,
  }) => {
    await openYearlyCheckout(page)

    const summary = page.getByTestId('checkout-order-summary')
    await expect(summary.getByText('WCPOS Pro Yearly')).toBeVisible({
      timeout: 15000,
    })
    await expect(summary.getByText('Qty: 1')).toBeVisible()
    // Line item total and the cart total both render $129.00.
    await expect(summary.getByText('$129.00')).toHaveCount(2)
    await expect(summary.getByText('Total', { exact: true })).toBeVisible()
  })

  test('persists the billing address and reaches the payment step', async ({
    page,
  }) => {
    await openYearlyCheckout(page)
    await completeBillingStep(page)

    // Collapsed billing summary
    await expect(page.getByTestId('checkout-step-2')).toHaveAttribute(
      'data-step-state',
      'done'
    )
    await expect(
      page.getByText('42 Wallaby Way, Sydney 2000, AU')
    ).toBeVisible()

    // The mocked build enables only BTCPay (no Stripe/PayPal keys), so the
    // payment selector shows exactly the Bitcoin row.
    await expect(page.getByTestId('payment-method-btcpay')).toBeVisible()
    await expect(page.getByTestId('payment-method-stripe')).toHaveCount(0)
    await expect(page.getByTestId('payment-method-paypal')).toHaveCount(0)
  })

  test('billing step can be reopened with Edit', async ({ page }) => {
    await openYearlyCheckout(page)
    await completeBillingStep(page)

    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByTestId('billing-step-form')).toBeVisible()
    // Previously entered values survive the reopen.
    await expect(page.getByLabel('Address')).toHaveValue('42 Wallaby Way')
  })

  test('shows error when no current Pro offer is provided', async ({
    page,
  }) => {
    await page.goto('/pro/checkout')

    await expect(page.getByText('No product selected')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByRole('link', { name: /Back to pricing/ }).first()
    ).toBeVisible()
  })

  test('back to pricing link returns to the pro page', async ({ page }) => {
    await openYearlyCheckout(page)

    // The page-level back link (the error state renders its own).
    const backLink = page.getByRole('link', { name: /Back to pricing/ }).first()
    await expect(backLink).toBeVisible()

    await backLink.click()
    await expect(page).toHaveURL(/\/pro$/)
    await expect(
      page.getByRole('heading', { name: 'WooCommerce POS Pro' })
    ).toBeVisible()
  })

  test('shows error state when cart creation fails', async ({ page }) => {
    // Failure injection happens at the browser -> Next API boundary; the mock
    // backend stays healthy so only this test sees the failure.
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

    await page.goto(YEARLY_CHECKOUT_PATH)

    await expect(
      page.getByText('Unable to initialize checkout. Please try again.')
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByRole('link', { name: /Back to pricing/ }).first()
    ).toBeVisible()
  })
})
