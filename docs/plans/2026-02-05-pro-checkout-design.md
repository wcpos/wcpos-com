# Pro Page Caching & Checkout Flow Design

**Date:** 2026-02-05
**Status:** Approved

## Problem

Three issues with the pro page and checkout:

1. Product loading is slow — fetched dynamically from Medusa on every request with only an in-memory cache that doesn't survive across Vercel serverless invocations
2. Payment methods don't render — environment variables (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `NEXT_PUBLIC_BTCPAY_ENABLED`) weren't set
3. No E2E test coverage on the checkout flow

## 1. Product Caching on the Pro Page

### Changes

Add a `'products'` cache profile in `next.config.ts`:

```ts
'products': {
  stale: 3600,       // Serve stale for 1 hour
  revalidate: 900,   // Start revalidating after 15 min
  expire: 86400,     // Expire after 24 hours
}
```

Add `'use cache'` + `cacheLife('products')` + `cacheTag('products')` to the `PricingSection` server component in `src/app/(main)/pro/page.tsx`.

### Removals

Remove the in-memory `Map` cache from `medusa-client.ts`:
- Remove `productCache` variable and `CACHE_TTL_MS` constant
- Remove cache-check logic from `getWcposProProducts()` and `getProducts()`
- Replace `clearProductCache()` with a note to use `revalidateTag('products')`

### Future per-country pricing

When regions are added, pass `region_id` as a parameter to the cached function. Next.js uses function arguments as implicit cache key segments, so each region gets its own cached result automatically.

## 2. Payment Collection Reuse in Checkout

### Problem

The current checkout creates a new payment collection every time the user switches between Stripe/PayPal/BTCPay tabs. Switching tabs three times creates three orphaned payment collections in Medusa.

### Fix

Split `initializePayment` in `medusa-client.ts` into two functions:

1. **`createPaymentCollection(cartId)`** — Creates the collection. Called once during checkout init.
2. **`createPaymentSession(paymentCollectionId, providerId)`** — Creates a session within an existing collection. Called on init and when switching provider.

Update `/api/store/cart/payment-sessions` route to accept an optional `paymentCollectionId`. If provided, skip collection creation and create the session directly.

Update `checkout-client.tsx`:
- Store `paymentCollectionId` in state
- `initializeCheckout` sets it after the first collection is created
- `selectPaymentMethod` passes it along instead of creating a new collection

Remove deprecated wrapper functions (`createPaymentSessions`, `setPaymentSession`).

## 3. E2E Testing Strategy

### Suite A: Checkout rendering (every PR)

File: `e2e/pro-checkout.spec.ts`

Tests the flow up to payment form rendering without submitting real payments:

- Navigate from pro page to checkout via "Get Started" button
- Cart creation and order summary displays correct product/price
- Email field renders (pre-filled if logged in)
- Payment method tabs appear (at least Stripe)
- Stripe Elements loads within the Stripe tab
- Switching between payment tabs works and shows correct content
- Error states — missing variant param, failed cart creation
- "Back to pricing" link works

Uses `page.route()` to mock `/api/store/cart/*` calls. No real payment credentials needed. Fast, no backend dependency.

### Suite B: Full purchase flow (nightly / on demand)

File: `e2e/pro-checkout-integration.spec.ts`

Full purchase with Stripe test credentials:

- Pro page → checkout → fill email → test card (4242...) → submit → order confirmation
- Requires `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set to `pk_test_` key
- Requires Medusa backend running and reachable
- Longer timeouts for payment processing
- Tagged with `@integration` for selective running: `pnpm test:e2e --grep @integration`

### CI setup

Default `pnpm test:e2e` runs Suite A only (mocked, fast). Suite B runs on schedule or manual trigger against beta.wcpos.com.

## Environment Variables

Set in Vercel (Production for now, move to Preview/Staging later):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Sandbox client ID |
| `NEXT_PUBLIC_BTCPAY_ENABLED` | `true` |

When going live, swap test keys for production keys.
