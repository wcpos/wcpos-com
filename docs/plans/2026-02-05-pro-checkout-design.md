# Pro Page Caching & Checkout Flow Implementation Plan

> **For Claude:** REQUIRED: Use /execute-plan to implement this plan task-by-task.

**Goal:** Fix slow product loading with Next.js caching, fix payment collection reuse in checkout, add E2E test coverage for the checkout flow.

**Architecture:** Add `'use cache'` directive to the pro page's `PricingSection` component with a long-lived cache profile, removing the in-memory Map cache. Split `initializePayment` into separate collection creation and session creation functions so payment tabs reuse a single collection. Add two E2E test suites — mocked rendering tests for CI, and real Stripe integration tests for nightly runs.

**Tech Stack:** Next.js 16 (PPR/cacheComponents), Medusa v2 Store API, Playwright, Stripe test mode

---

## Task 1: Add products cache profile to Next.js config

**Files:**
- Modify: `next.config.ts`

**Step 1: Add the cache profile**

In `next.config.ts`, add `'products'` to the `cacheLife` object:

```ts
'products': {
  stale: 3600,       // Serve stale for 1 hour
  revalidate: 900,   // Start revalidating after 15 min
  expire: 86400,     // Expire after 24 hours
},
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds. The new cache profile is just config, no functional change yet.

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: add products cache profile for pro page"
```

---

## Task 2: Add 'use cache' to PricingSection and remove in-memory cache

**Files:**
- Modify: `src/app/(main)/pro/page.tsx`
- Modify: `src/services/core/external/medusa-client.ts`
- Modify: `src/services/core/external/medusa-client.test.ts`

**Step 1: Add cache directives to PricingSection**

In `src/app/(main)/pro/page.tsx`, update `PricingSection` to use the cache:

```tsx
import { cacheLife } from 'next/dist/server/use-cache/cache-life'
import { cacheTag } from 'next/dist/server/use-cache/cache-tag'

async function PricingSection() {
  'use cache'
  cacheLife('products')
  cacheTag('products')

  const products = await getWcposProProducts()
  // ... rest unchanged
}
```

**Step 2: Remove in-memory cache from medusa-client.ts**

In `src/services/core/external/medusa-client.ts`:

1. Remove lines 28-29 (the `productCache` Map and `CACHE_TTL_MS` constant)
2. Simplify `getProducts()` — remove the cache check/set logic, keep just the fetch + return
3. Simplify `getWcposProProducts()` — remove the cache check/set logic, keep just the fetch + filter + return
4. Remove the `clearProductCache()` function entirely
5. Remove `clearProductCache` from the `medusaClient` export object

The simplified `getProducts`:

```ts
export async function getProducts(): Promise<MedusaProduct[]> {
  try {
    const response = await medusaFetch<MedusaProductsResponse>(
      '/store/products?fields=*variants.prices'
    )
    return response.products
  } catch (error) {
    storeLogger.error`Failed to fetch products: ${error}`
    return []
  }
}
```

The simplified `getWcposProProducts`:

```ts
export async function getWcposProProducts(): Promise<MedusaProduct[]> {
  try {
    const response = await medusaFetch<MedusaProductsResponse>(
      '/store/products?fields=*variants.prices'
    )
    return response.products.filter(
      (p) => p.handle?.startsWith('wcpos-pro-')
    )
  } catch (error) {
    storeLogger.error`Failed to fetch WCPOS Pro products: ${error}`
    return []
  }
}
```

**Step 3: Update unit tests**

In `src/services/core/external/medusa-client.test.ts`:

1. Remove import of `clearProductCache`
2. Remove `clearProductCache()` calls from `beforeEach`/`afterEach`
3. Remove the "uses cache on subsequent calls" test (cache is now handled by Next.js, not testable in unit tests)
4. Update any tests that relied on cache clearing between calls — each test already uses `vi.clearAllMocks()` on `mockFetch` so they're isolated

**Step 4: Run unit tests**

Run: `pnpm test:unit`
Expected: All tests pass (the cache-specific test is removed, everything else unchanged).

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds. The pro page now uses Next.js caching.

**Step 6: Commit**

```bash
git add src/app/(main)/pro/page.tsx src/services/core/external/medusa-client.ts src/services/core/external/medusa-client.test.ts
git commit -m "feat: use Next.js cache for pro page products, remove in-memory cache"
```

---

## Task 3: Split initializePayment into createPaymentCollection + createPaymentSession

**Files:**
- Modify: `src/services/core/external/medusa-client.ts`
- Modify: `src/services/core/external/medusa-client.test.ts`

**Step 1: Write failing tests for the new functions**

In `src/services/core/external/medusa-client.test.ts`, replace the `createPaymentSessions` and `setPaymentSession` test blocks with tests for the new functions. Update the import to use `createPaymentCollection, createPaymentSession` instead of `createPaymentSessions, setPaymentSession`.

```ts
describe('createPaymentCollection', () => {
  it('creates a payment collection for a cart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payment_collection: {
          id: 'pay_col_123',
          currency_code: 'usd',
          amount: 129,
        },
      }),
    })

    const result = await createPaymentCollection('cart_123')

    expect(result).not.toBeNull()
    expect(result?.id).toBe('pay_col_123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://store-api.wcpos.com/store/payment-collections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ cart_id: 'cart_123' }),
      })
    )
  })

  it('returns null on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await createPaymentCollection('cart_123')
    expect(result).toBeNull()
  })
})

describe('createPaymentSession', () => {
  it('creates a payment session within an existing collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payment_collection: {
          id: 'pay_col_123',
          payment_sessions: [
            {
              id: 'payses_123',
              provider_id: 'pp_stripe_stripe',
              status: 'pending',
              data: { client_secret: 'pi_secret_123' },
            },
          ],
        },
      }),
    })

    const result = await createPaymentSession('pay_col_123', 'pp_stripe_stripe')

    expect(result).not.toBeNull()
    expect(result?.clientSecret).toBe('pi_secret_123')
    expect(result?.paymentSessionId).toBe('payses_123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://store-api.wcpos.com/store/payment-collections/pay_col_123/payment-sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ provider_id: 'pp_stripe_stripe' }),
      })
    )
  })

  it('returns null client secret when provider does not return one', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payment_collection: {
          id: 'pay_col_123',
          payment_sessions: [
            {
              id: 'payses_456',
              provider_id: 'pp_paypal_paypal',
              status: 'pending',
              data: {},
            },
          ],
        },
      }),
    })

    const result = await createPaymentSession('pay_col_123', 'pp_paypal_paypal')

    expect(result).not.toBeNull()
    expect(result?.clientSecret).toBeNull()
    expect(result?.paymentSessionId).toBe('payses_456')
  })

  it('returns null on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const result = await createPaymentSession('pay_col_123', 'pp_stripe_stripe')
    expect(result).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:unit`
Expected: FAIL — `createPaymentCollection` and `createPaymentSession` are not exported.

**Step 3: Implement the new functions in medusa-client.ts**

Replace `initializePayment` and the two deprecated wrappers with:

```ts
/**
 * Create a payment collection for a cart (Medusa v2)
 * Called once during checkout initialization.
 */
export async function createPaymentCollection(
  cartId: string
): Promise<PaymentCollectionResponse['payment_collection'] | null> {
  try {
    const response = await medusaFetch<PaymentCollectionResponse>(
      '/store/payment-collections',
      {
        method: 'POST',
        body: JSON.stringify({ cart_id: cartId }),
      }
    )
    return response.payment_collection
  } catch (error) {
    storeLogger.error`Failed to create payment collection: ${error}`
    return null
  }
}

/**
 * Payment session creation result
 */
export interface PaymentSessionResult {
  clientSecret: string | null
  paymentSessionId: string | null
}

/**
 * Create a payment session within an existing collection (Medusa v2)
 * Called on init and when switching payment provider.
 */
export async function createPaymentSession(
  paymentCollectionId: string,
  providerId: string
): Promise<PaymentSessionResult | null> {
  try {
    const response = await medusaFetch<PaymentCollectionResponse>(
      `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ provider_id: providerId }),
      }
    )

    const paymentSession = response.payment_collection.payment_sessions?.[0]
    return {
      clientSecret: paymentSession?.data?.client_secret || null,
      paymentSessionId: paymentSession?.id || null,
    }
  } catch (error) {
    storeLogger.error`Failed to create payment session: ${error}`
    return null
  }
}
```

Also remove `initializePayment`, `createPaymentSessions`, `setPaymentSession`, and the `PaymentInitResult` interface. Update the `medusaClient` export object:

```ts
export const medusaClient = {
  // Products
  getProducts,
  getWcposProProducts,
  getProductByHandle,
  getProductById,
  getRegions,
  formatPrice,
  getVariantPrice,
  // Cart
  createCart,
  getCart,
  addLineItem,
  updateCart,
  // Payment (Medusa v2)
  createPaymentCollection,
  createPaymentSession,
  completeCart,
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:unit`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/services/core/external/medusa-client.ts src/services/core/external/medusa-client.test.ts
git commit -m "refactor: split initializePayment into createPaymentCollection + createPaymentSession"
```

---

## Task 4: Update API route to support payment collection reuse

**Files:**
- Modify: `src/app/api/store/cart/payment-sessions/route.ts`

**Step 1: Update the route handler**

The route now accepts an optional `paymentCollectionId`. If provided, skip collection creation and just create the session. If not provided, create both (for initial checkout).

```ts
import { NextRequest, NextResponse } from 'next/server'
import {
  createPaymentCollection,
  createPaymentSession,
  getCart,
} from '@/services/core/external/medusa-client'
import { storeLogger } from '@/lib/logger'

/**
 * POST /api/store/cart/payment-sessions
 *
 * Body:
 *   - cartId: string (required)
 *   - provider_id: string (optional, defaults to 'pp_stripe_stripe')
 *   - paymentCollectionId: string (optional — if provided, reuses existing collection)
 *
 * Returns: { cart, paymentCollectionId, clientSecret, paymentSessionId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, provider_id, paymentCollectionId: existingCollectionId } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    const providerId = provider_id || 'pp_stripe_stripe'

    // Create collection if not provided
    let collectionId = existingCollectionId
    if (!collectionId) {
      const collection = await createPaymentCollection(cartId)
      if (!collection) {
        return NextResponse.json(
          { error: 'Failed to create payment collection' },
          { status: 500 }
        )
      }
      collectionId = collection.id
    }

    // Create session within the collection
    const session = await createPaymentSession(collectionId, providerId)
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create payment session' },
        { status: 500 }
      )
    }

    // Get the updated cart
    const cart = await getCart(cartId)
    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      cart,
      paymentCollectionId: collectionId,
      clientSecret: session.clientSecret,
      paymentSessionId: session.paymentSessionId,
    })
  } catch (error) {
    storeLogger.error`Error with payment sessions: ${error}`
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/store/cart/payment-sessions/route.ts
git commit -m "feat: support payment collection reuse in payment-sessions route"
```

---

## Task 5: Update checkout-client.tsx to reuse payment collection

**Files:**
- Modify: `src/components/pro/checkout-client.tsx`

**Step 1: Add paymentCollectionId state and update initializeCheckout**

Add state for the collection ID:

```ts
const [paymentCollectionId, setPaymentCollectionId] = useState<string | null>(null)
```

In `initializeCheckout`, after the payment sessions response, store the collection ID:

```ts
const paymentResult = await sessionsResponse.json()
setCart(paymentResult.cart)
setPaymentCollectionId(paymentResult.paymentCollectionId)
```

**Step 2: Update selectPaymentMethod to pass existing collection ID**

In `selectPaymentMethod`, send the `paymentCollectionId` in the request body:

```ts
const selectPaymentMethod = useCallback(
  async (method: PaymentMethod) => {
    if (!cart || !paymentCollectionId) return

    setIsProcessing(true)
    setError(null)
    setClientSecret(null)

    try {
      const response = await fetch('/api/store/cart/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          provider_id: getProviderId(method),
          paymentCollectionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to select ${method} payment`)
      }

      const paymentResult = await response.json()
      setCart(paymentResult.cart)

      if (method === 'stripe' && paymentResult.clientSecret) {
        setClientSecret(paymentResult.clientSecret)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select payment method')
    } finally {
      setIsProcessing(false)
    }
  },
  [cart, paymentCollectionId]
)
```

Also remove the stale comment on line 163: `// Note: This creates a NEW payment collection/session each time`

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/pro/checkout-client.tsx
git commit -m "feat: reuse payment collection when switching payment methods"
```

---

## Task 6: E2E Suite A — Checkout rendering tests (mocked)

**Files:**
- Create: `e2e/pro-checkout.spec.ts`

**Step 1: Write the test file**

This suite mocks API responses so it doesn't need a running Medusa backend or real payment keys. Uses `page.route()` to intercept fetch calls.

```ts
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
```

**Step 2: Run the tests**

Run: `pnpm test:e2e e2e/pro-checkout.spec.ts --project=chromium`
Expected: All tests pass. (The mocked tests only need the Next.js dev/build server, not the Medusa backend.)

**Step 3: Commit**

```bash
git add e2e/pro-checkout.spec.ts
git commit -m "test: add E2E checkout rendering tests with mocked API"
```

---

## Task 7: E2E Suite B — Integration tests (real Stripe)

**Files:**
- Create: `e2e/pro-checkout-integration.spec.ts`

**Step 1: Write the integration test file**

This suite requires real Stripe test keys and a running Medusa backend. Tagged `@integration` so it can be run selectively.

```ts
import { test, expect } from '@playwright/test'

test.describe('Checkout Integration @integration', {
  tag: '@integration',
}, () => {
  test.setTimeout(120_000)

  test.skip(
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'Stripe test key not configured'
  )

  test('completes full purchase with Stripe test card', async ({ page }) => {
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
  })
})
```

**Step 2: Verify the test is skipped without Stripe key**

Run: `pnpm test:e2e e2e/pro-checkout-integration.spec.ts --project=chromium`
Expected: Test is skipped with message "Stripe test key not configured" (unless env var is set).

**Step 3: Commit**

```bash
git add e2e/pro-checkout-integration.spec.ts
git commit -m "test: add E2E Stripe integration test for full checkout flow"
```

---

## Task 8: Update Playwright config for integration test separation

**Files:**
- Modify: `playwright.config.ts`

**Step 1: Add grep exclusion for default runs**

Update `playwright.config.ts` to exclude `@integration` tagged tests by default:

```ts
use: {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
},

// Exclude integration tests by default (run with --grep @integration)
grep: process.env.INCLUDE_INTEGRATION ? undefined : /^(?!.*@integration)/,
```

This means:
- `pnpm test:e2e` — runs only Suite A (fast, mocked)
- `INCLUDE_INTEGRATION=1 pnpm test:e2e` — runs everything including Suite B
- `pnpm test:e2e --grep @integration` — runs only Suite B

**Step 2: Run default suite to verify exclusion**

Run: `pnpm test:e2e --project=chromium`
Expected: Integration tests are NOT included in the run.

**Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "config: exclude integration tests from default E2E runs"
```

---

## Summary of all files changed

| File | Action |
|---|---|
| `next.config.ts` | Add `products` cache profile |
| `src/app/(main)/pro/page.tsx` | Add `'use cache'` + `cacheLife` + `cacheTag` |
| `src/services/core/external/medusa-client.ts` | Remove in-memory cache, split `initializePayment` into two functions, remove deprecated wrappers |
| `src/services/core/external/medusa-client.test.ts` | Update tests for new functions, remove cache tests |
| `src/app/api/store/cart/payment-sessions/route.ts` | Accept optional `paymentCollectionId` |
| `src/components/pro/checkout-client.tsx` | Store and pass `paymentCollectionId` |
| `e2e/pro-checkout.spec.ts` | New: mocked checkout rendering tests |
| `e2e/pro-checkout-integration.spec.ts` | New: real Stripe integration tests |
| `playwright.config.ts` | Exclude `@integration` from default runs |
