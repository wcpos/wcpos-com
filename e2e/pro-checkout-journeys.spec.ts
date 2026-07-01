import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import {
  YEARLY_CHECKOUT_PATH,
  completeAccountStep,
  completeBillingStep,
  openYearlyCheckout,
  signInAs,
} from './helpers/checkout'

/**
 * Full purchase journeys against the mocked backend — the launch-critical
 * paths, end to end:
 *
 *  - inline account creation during checkout (new + existing email)
 *  - the whole money path for a real payment method (BTCPay is a plain
 *    redirect, so the mocked suite can drive invoice → settle → success)
 *  - license delivery: the completed order surfaces the license in the
 *    customer's account
 *  - the checkout-safety net: order-pending (paid but no order) blocks the
 *    checkout across reloads; payment-session failures surface an error
 *  - API-level provider matrix: cart → session → complete for all three
 *    providers, plus completion failure modes, without any UI
 *
 * What this suite deliberately does NOT cover (needs real keys — see the
 * @integration suite): Stripe card confirmation, Apple/Google Pay wallets,
 * PayPal approval popups.
 */

function uniqueEmail(prefix = 'buyer') {
  return `${prefix}+${randomUUID().slice(0, 8)}@example.com`
}

const PASSWORD = 'e2e-checkout-pass-1'

/** Drives the app's own API routes with the request context's cookies. */
async function apiCheckout(
  request: APIRequestContext,
  {
    completeBody = {},
    provider = 'pp_stripe_stripe',
  }: {
    completeBody?: Record<string, unknown>
    provider?: string
  } = {}
) {
  const cartResponse = await request.post('/api/store/cart', { data: {} })
  expect(cartResponse.status()).toBe(200)
  const { cart } = await cartResponse.json()

  const lineItems = await request.post('/api/store/cart/line-items', {
    data: { cartId: cart.id, product: 'wcpos-pro-yearly', quantity: 1 },
  })
  expect(lineItems.status()).toBe(200)

  const session = await request.post('/api/store/cart/payment-sessions', {
    data: { cartId: cart.id, provider_id: provider },
  })
  expect(session.status()).toBe(200)
  const sessionBody = await session.json()

  const complete = await request.post('/api/store/cart/complete', {
    data: {
      cartId: cart.id,
      experiment: 'pro_checkout_v1',
      experimentVariant: 'control',
      ...completeBody,
    },
  })
  return { cart, sessionBody, complete }
}

async function registerViaApi(
  request: APIRequestContext,
  email: string,
  password = PASSWORD
) {
  const response = await request.post('/api/auth/register', {
    data: { email, password },
  })
  expect(response.status()).toBe(200)
}

test.describe('Journey: new customer buys with Bitcoin', () => {
  test('registers inline, pays the BTCPay invoice, and finds the license in their account', async ({
    page,
  }) => {
    const email = uniqueEmail('btc-buyer')

    // 1. Land on checkout signed out — account step is first.
    await page.goto(YEARLY_CHECKOUT_PATH)
    await completeAccountStep(page, email, PASSWORD)

    // 2. Billing address.
    await completeBillingStep(page)

    // 3. Bitcoin is the only enabled method in the mocked build; its row is
    //    pre-selected, and the BTCPay session was created at init.
    await expect(page.getByTestId('payment-method-btcpay')).toHaveAttribute(
      'aria-checked',
      'true'
    )
    const payButton = page.getByRole('button', { name: /pay with bitcoin/i })
    await expect(payButton).toBeVisible({ timeout: 15000 })

    // 4. Redirect to the (mock) BTCPay invoice and pay it.
    await payButton.click()
    await expect(page.getByTestId('btcpay-invoice')).toBeVisible({
      timeout: 15000,
    })
    await page.getByTestId('btcpay-pay').click()

    // 5. The "webhook" settles the order and BTCPay returns us to success.
    await expect(page).toHaveURL(/\/pro\/checkout\/success/, {
      timeout: 15000,
    })
    await expect(page.getByText('Thank You!')).toBeVisible()

    // 6. License delivery: the completed order surfaces the license in the
    //    brand-new account (keys render masked to their last group).
    await page.goto('/account/licenses')
    await expect(page.getByText('****-****-7777')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('active', { exact: true })).toBeVisible()
  })

  test('existing email flips the account step into sign-in and continues', async ({
    page,
  }) => {
    const email = uniqueEmail('returning')

    // Seed the account (as if created on an earlier visit).
    await page.request.post('/api/auth/register', {
      data: { email, password: PASSWORD },
    })
    await page.context().clearCookies()

    await page.goto(YEARLY_CHECKOUT_PATH)
    await expect(page.getByTestId('account-step-form')).toBeVisible({
      timeout: 15000,
    })
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page
      .getByRole('button', { name: /create account & continue/i })
      .click()

    // 409 ACCOUNT_EXISTS → sign-in mode with the same credentials.
    await expect(page.getByTestId('account-exists-notice')).toBeVisible()
    await page.getByRole('button', { name: /sign in & continue/i }).click()

    await expect(page.getByTestId('checkout-step-2')).toHaveAttribute(
      'data-step-state',
      'active',
      { timeout: 15000 }
    )
    await expect(page.getByText(email)).toBeVisible()
  })

  test('wrong password on an existing account shows an error and stays on the account step', async ({
    page,
  }) => {
    const email = uniqueEmail('wrongpass')
    await page.request.post('/api/auth/register', {
      data: { email, password: PASSWORD },
    })
    await page.context().clearCookies()

    await page.goto(YEARLY_CHECKOUT_PATH)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('not-the-password-1')
    await page
      .getByRole('button', { name: /create account & continue/i })
      .click()
    await expect(page.getByTestId('account-exists-notice')).toBeVisible()

    await page.getByRole('button', { name: /sign in & continue/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByTestId('checkout-step-1')).toHaveAttribute(
      'data-step-state',
      'active'
    )
  })
})

test.describe('Journey: signed-in customer', () => {
  test('buys with Bitcoin end-to-end from an existing account', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-none')

    await openYearlyCheckout(page)
    await completeBillingStep(page)

    await page.getByRole('button', { name: /pay with bitcoin/i }).click()
    await page.getByTestId('btcpay-pay').click()
    await expect(page).toHaveURL(/\/pro\/checkout\/success/, {
      timeout: 15000,
    })
  })
})

test.describe('Checkout safety net', () => {
  test('a persisted order-pending failure blocks checkout across reloads', async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAs(context, baseURL, 'e2e-none')

    // Seed the protective state the way a real order-pending failure would
    // have (sessionStorage survives reloads within the tab).
    await page.goto(YEARLY_CHECKOUT_PATH)
    await page.evaluate(() => {
      sessionStorage.setItem(
        'wcpos:checkout-pending:cart-e2e-blocked',
        JSON.stringify({
          kind: 'order_pending',
          message:
            'Your payment was received, but we could not finish creating your order.',
          reference: 'WCPOS-E2E-PENDING',
          cartId: 'cart-e2e-blocked',
          storedAt: Date.now(),
        })
      )
    })
    await page.reload()

    // The whole checkout is replaced by the do-not-pay-again notice.
    await expect(
      page.getByText('Payment received — order pending')
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/do not pay again/i)).toBeVisible()
    await expect(page.getByText('WCPOS-E2E-PENDING')).toBeVisible()
    await expect(page.getByTestId('billing-step-form')).toHaveCount(0)

    // Still blocked after another reload.
    await page.reload()
    await expect(
      page.getByText('Payment received — order pending')
    ).toBeVisible({ timeout: 15000 })
  })

  test('a payment-session failure surfaces an init error instead of a dead end', async ({
    page,
  }) => {
    // The fail-session+ email prefix makes the mock reject payment-collection
    // creation — the init path's payment step should fail loudly.
    const email = `fail-session+${randomUUID().slice(0, 8)}@example.com`
    await page.goto(YEARLY_CHECKOUT_PATH)
    await completeAccountStep(page, email, PASSWORD)

    await expect(
      page.getByText('Unable to initialize checkout. Please try again.')
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('API-level provider matrix', () => {
  // Each provider path drives the app's real API routes end to end against
  // the mocked Medusa: cart → line item → payment session → completion.
  for (const provider of [
    'pp_stripe_stripe',
    'pp_paypal_paypal',
    'pp_btcpay_btcpay',
  ]) {
    test(`completes an order via ${provider}`, async ({ request }) => {
      await registerViaApi(request, uniqueEmail('matrix'))

      const { sessionBody, complete } = await apiCheckout(request, {
        provider,
      })

      // Session data is provider-shaped.
      const sessions =
        sessionBody.cart.payment_collection.payment_sessions as Array<{
          provider_id: string
          data: Record<string, unknown>
        }>
      const session = sessions.find((s) => s.provider_id === provider)
      expect(session).toBeTruthy()
      if (provider === 'pp_stripe_stripe') {
        expect(session!.data.client_secret).toBeTruthy()
      }
      if (provider === 'pp_btcpay_btcpay') {
        expect(session!.data.checkoutLink).toContain('/btcpay/checkout/')
      }
      if (provider === 'pp_paypal_paypal') {
        expect(session!.data.id).toBeTruthy()
      }

      // Completion returns a real order carrying license metadata.
      expect(complete.status()).toBe(200)
      const { order } = await complete.json()
      expect(order.id).toBeTruthy()
      expect(order.metadata.licenses[0].license_key).toBe(
        'PURC-HASE-FLOW-7777'
      )
    })
  }

  test('completion that returns no order surfaces the order_pending contract', async ({
    request,
  }) => {
    // The order-pending+ email prefix makes the mock return HTTP 200 with no
    // order — the paid-but-stuck state the client treats as money-at-risk.
    await registerViaApi(request, `order-pending+${randomUUID().slice(0, 8)}@example.com`)

    const { complete } = await apiCheckout(request)

    expect(complete.status()).toBe(409)
    const body = await complete.json()
    expect(body.code).toBe('order_pending')
  })

  test('completion failure (5xx from Medusa) also maps to the protective contract', async ({
    request,
  }) => {
    await registerViaApi(request, `fail-complete+${randomUUID().slice(0, 8)}@example.com`)

    const { complete } = await apiCheckout(request)

    // Whatever the transport failure, the route must NOT report success —
    // and the client treats any non-order response as order-pending.
    expect(complete.ok()).toBe(false)
    const body = await complete.json()
    expect(body.order?.id).toBeFalsy()
  })

  test('an account created during checkout can immediately read its own licenses', async ({
    request,
  }) => {
    const email = uniqueEmail('fresh')
    await registerViaApi(request, email)

    const { complete } = await apiCheckout(request)
    expect(complete.status()).toBe(200)

    // The freshly created account resolves its license from the completed
    // order — the exact wiring /account/licenses depends on.
    const licenses = await request.get('/api/account/licenses')
    expect(licenses.status()).toBe(200)
    const body = await licenses.json()
    expect(JSON.stringify(body)).toContain('lic-e2e-purchase')
  })
})
