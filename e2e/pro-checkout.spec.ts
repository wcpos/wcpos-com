import { test, expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

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
 * Scope: everything up to and including the checkout page rendering with an
 * order summary and the payment area, plus navigation paths. Stripe Elements
 * cannot run against a mock backend (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 * is not set for the mocked build, so no provider tab renders here). Card
 * entry and payment confirmation are covered by
 * e2e/pro-checkout-integration.spec.ts (@integration — real backends and
 * real Stripe test keys).
 */

// Persona without licenses — semantically, a customer about to buy.
const CHECKOUT_PERSONA = 'e2e-none'
const CHECKOUT_PERSONA_EMAIL = 'nolicense@example.com'

// wcpos-pro-yearly + variant_e2e_yearly resolve to the current WCPOS Pro
// Yearly offer ($129.00) in e2e/mocks/fixtures.json.
const YEARLY_CHECKOUT_PATH =
  '/pro/checkout?product=wcpos-pro-yearly&variant=variant_e2e_yearly'
const MOCK_BACKEND_URL = `http://127.0.0.1:${Number(
  process.env.E2E_MOCK_PORT || 4873
)}`

async function signInAs(
  context: BrowserContext,
  baseURL: string | undefined,
  token: string
) {
  await context.addCookies([
    {
      name: 'medusa-token',
      value: token,
      url: baseURL ?? 'http://localhost:3000',
    },
  ])
}

async function openYearlyCheckout(page: Page) {
  await page.goto(YEARLY_CHECKOUT_PATH)
  await expect(page.getByText('Order Summary')).toBeVisible({ timeout: 15000 })
}

test.describe('Checkout auth gating', () => {
  test('redirects unauthenticated users to login with redirect param', async ({
    page,
  }) => {
    await page.goto(YEARLY_CHECKOUT_PATH)

    const encoded = encodeURIComponent(YEARLY_CHECKOUT_PATH).replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encoded}`))
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
    await expect(page.getByText('Order Summary')).toBeVisible({
      timeout: 15000,
    })
  })

  test('displays order summary with the selected product', async ({ page }) => {
    await openYearlyCheckout(page)

    await expect(page.getByText('WCPOS Pro Yearly')).toBeVisible()
    await expect(page.getByText('Qty: 1')).toBeVisible()
    // Line item total and the cart total both render $129.00.
    await expect(page.getByText('$129.00')).toHaveCount(2)
    await expect(page.getByText('Total', { exact: true })).toBeVisible()
  })

  test('displays the account email read-only', async ({ page }) => {
    await openYearlyCheckout(page)

    const emailInput = page.getByLabel('Email address')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveValue(CHECKOUT_PERSONA_EMAIL)
    // The account email is locked in (readOnly input).
    await expect(emailInput).not.toBeEditable()
    await expect(page.getByText('Using your account email')).toBeVisible()
  })

  test('displays the payment method area', async ({ page }) => {
    await openYearlyCheckout(page)

    await expect(page.getByText('Payment', { exact: true })).toBeVisible()
    // The payment-method tablist renders; individual provider tabs (Card /
    // PayPal / Bitcoin) require build-time NEXT_PUBLIC_* payment keys, which
    // the mocked suite intentionally omits — provider UIs are exercised by
    // the @integration suite against real backends.
    await expect(page.getByRole('tablist')).toBeVisible()
    await expect(page.getByText('Secure payment processing')).toBeVisible()
  })

  test('shows error when no current Pro offer is provided', async ({ page }) => {
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

    await expect(page.getByText('Failed to create cart')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByRole('link', { name: /Back to pricing/ }).first()
    ).toBeVisible()
  })
})
