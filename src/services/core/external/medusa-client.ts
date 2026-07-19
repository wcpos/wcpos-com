import 'server-only'

import {
  getCheckoutGatewaySecret,
  getRequestStoreEnvironment,
  type StoreEnvironment,
} from '@/lib/store-environment'
import { storeLogger } from '@/lib/logger'
import type {
  MedusaProduct,
  MedusaProductsResponse,
  MedusaCart,
  MedusaCartResponse,
  CreateCartInput,
  AddLineItemInput,
  UpdateCartInput,
  CompleteCartResponse,
} from '@/types/medusa'

/**
 * Medusa Client
 *
 * Server-side client for the MedusaJS Store API.
 * Used to fetch products and manage cart/checkout for the /pro page.
 */

class MedusaApiError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: string
  ) {
    super(`Medusa API error: ${status}`)
    this.name = 'MedusaApiError'
  }
}

function isInvalidPromotionCodeError(error: unknown): boolean {
  return (
    error instanceof MedusaApiError &&
    error.status === 400 &&
    /promotion code .* is invalid/i.test(error.responseBody)
  )
}

/**
 * Make a request to the Medusa Store API.
 *
 * The backend is host-keyed (wcpos.com → live, beta → staging, localhost →
 * dev; see store-environment.ts). Request-scoped callers omit `storeEnv` and
 * it resolves from the request host; 'use cache' callers MUST pass it in
 * (headers() is unavailable inside the cache scope, and the environment must
 * be part of the cache key so beta prices never leak into wcpos.com).
 */
async function medusaFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  storeEnv?: StoreEnvironment
): Promise<T> {
  const environment = storeEnv ?? (await getRequestStoreEnvironment())
  const url = `${environment.medusaBackendUrl}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge any headers from options
  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>
    Object.assign(headers, optHeaders)
  }

  // Add publishable API key if available
  if (environment.medusaPublishableKey) {
    headers['x-publishable-api-key'] = environment.medusaPublishableKey
  }

  const gatewaySecret = getCheckoutGatewaySecret(environment)
  if (gatewaySecret) {
    headers['x-wcpos-checkout-gateway'] = gatewaySecret
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // Carry enough context to diagnose from the alert alone: the bare
    // "API error: 400" embed proved undebuggable (2026-07-02), and the
    // caller's contextful follow-up log gets eaten by the Discord sink's
    // per-category rate limit.
    const body = await response.text().catch(() => '')
    storeLogger.error`Medusa API error ${response.status} on ${options.method ?? 'GET'} ${endpoint} [${environment.name}]: ${body.slice(0, 300)}`
    throw new MedusaApiError(response.status, body)
  }

  return response.json()
}

/**
 * Bearer-auth headers for a Medusa customer JWT, or `{}` when there is no token.
 * Spread into a request's `headers` so authenticated store calls resolve
 * `auth_context.actor_id` to the signed-in customer; anonymous/mock callers fall
 * back to publishable-key-only. Keeps the header construction in one place.
 */
function buildAuthHeaders(authToken?: string | null): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {}
}

/**
 * Get all published products
 */
export async function getProducts(
  storeEnv?: StoreEnvironment
): Promise<MedusaProduct[]> {
  try {
    const response = await medusaFetch<MedusaProductsResponse>(
      '/store/products?fields=*variants.prices',
      {},
      storeEnv
    )
    return response.products
  } catch (error) {
    storeLogger.error`Failed to fetch products: ${error}`
    return []
  }
}

interface CartPaymentProviderContext {
  cartRegionId: string | null
  providerIds: string[] | null
}

/**
 * Payment provider ids registered and enabled on the region checkout will use
 * for new carts.
 *
 * Returns null provider ids when the backend cannot be asked (down, or a mock
 * without the endpoint) so callers can fail open instead of hiding every
 * payment method on a transient error.
 */
export async function getCartPaymentProviderContext(
  storeEnv?: StoreEnvironment
): Promise<CartPaymentProviderContext> {
  interface RegionWithProviders {
    id: string
    currency_code?: string
    payment_providers?: Array<{ id: string; is_enabled?: boolean }>
  }

  try {
    const response = await medusaFetch<{ regions: RegionWithProviders[] }>(
      '/store/regions?fields=id,name,currency_code,*payment_providers',
      {},
      storeEnv
    )
    const regions = response.regions ?? []
    // Checkout passes this region_id when creating the cart, so provider
    // filtering and the cart's region stay coupled even if Medusa's implicit
    // default region differs from /store/regions order.
    //
    // The store advertises USD prices everywhere, so the cart must resolve to
    // the USD region regardless of Medusa's region ordering (its implicit
    // first region may be EUR, which would charge €-prices under a $-labelled
    // catalog). Fall back to the first region only if no USD region exists.
    const cartRegion: RegionWithProviders | undefined =
      regions.find(
        (region) => region.currency_code?.toLowerCase() === 'usd'
      ) ?? regions[0]
    const hasAnyProviderEvidence = regions.some(
      (region) => (region.payment_providers?.length ?? 0) > 0
    )
    const ids = new Set<string>()
    let sawProvider = false

    for (const provider of cartRegion?.payment_providers ?? []) {
      sawProvider = true
      if (provider.is_enabled !== false) {
        ids.add(provider.id)
      }
    }

    if (!sawProvider && !hasAnyProviderEvidence) {
      // No positive evidence: a backend that ignores the *payment_providers
      // expansion (version/config drift) is indistinguishable from one with
      // zero providers. Filtering on [] would hide every payment method on a
      // 200 response — the outage class this function exists to prevent —
      // so fail open and let session creation surface any real problem.
      storeLogger.warn`No enabled payment providers reported by /store/regions; skipping method filtering`
      return { cartRegionId: null, providerIds: null }
    }

    return { cartRegionId: cartRegion?.id ?? null, providerIds: [...ids] }
  } catch (error) {
    storeLogger.error`Failed to fetch region payment providers: ${error}`
    return { cartRegionId: null, providerIds: null }
  }
}

/**
 * Format price for display
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  locale: string = 'en-US',
  options: Intl.NumberFormatOptions = {}
): string {
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
    ...options,
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount)
  } catch {
    return new Intl.NumberFormat('en-US', formatOptions).format(amount)
  }
}

/**
 * Get the price for a specific currency from a variant
 */
export function getVariantPrice(
  variant: MedusaProduct['variants'][0],
  currencyCode: string = 'usd'
): number | null {
  const price = variant.prices.find(
    (p) => p.currency_code.toLowerCase() === currencyCode.toLowerCase()
  )
  return price?.amount ?? null
}

// ============================================================================
// Cart Management
// ============================================================================

/**
 * Create a new cart
 *
 * `authToken` is the caller's Medusa customer JWT. When present it is forwarded
 * as Bearer auth so Medusa resolves `auth_context.actor_id` and sets
 * `cart.customer_id` to the signed-in customer — otherwise the cart (and any
 * order completed from it) stays an email-bound guest (see #284). Optional so
 * anonymous/mock callers keep working with the publishable key only.
 */
export async function createCart(
  input: CreateCartInput = {},
  authToken?: string | null
): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>('/store/carts', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: buildAuthHeaders(authToken),
    })
    return response.cart
  } catch (error) {
    storeLogger.error`Failed to create cart: ${error}`
    return null
  }
}

/**
 * Get a cart by ID
 */
export async function getCart(cartId: string): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>(`/store/carts/${cartId}`)
    return response.cart
  } catch (error) {
    storeLogger.error`Failed to get cart ${cartId}: ${error}`
    return null
  }
}

/**
 * Add a line item to a cart
 *
 * `authToken` is the caller's Medusa customer JWT, forwarded as Bearer auth for
 * the same reason as `createCart`/`updateCart`: mutating a now-customer-linked
 * cart must carry the matching auth context so Medusa keeps `cart.customer_id`
 * (and does not reject the mutation of a customer-owned cart). Optional so
 * anonymous/mock callers keep working with the publishable key only (see #284).
 */
export async function addLineItem(
  cartId: string,
  item: AddLineItemInput,
  authToken?: string | null
): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>(
      `/store/carts/${cartId}/line-items`,
      {
        method: 'POST',
        body: JSON.stringify(item),
        headers: buildAuthHeaders(authToken),
      }
    )
    return response.cart
  } catch (error) {
    storeLogger.error`Failed to add line item: ${error}`
    return null
  }
}

/**
 * Add promotion codes to a cart.
 *
 * Medusa 2.17.2 returns an `invalid_data` 400 when a code does not exist, but
 * returns 200 with the code unattached when an existing promotion is expired
 * or exhausted. Normalize the 400 shape to the same unchanged-cart result so
 * the route can determine `applied` from the returned cart in both cases.
 */
export async function addCartPromotions(
  cartId: string,
  promoCodes: string[],
  authToken?: string | null
): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>(
      `/store/carts/${cartId}/promotions`,
      {
        method: 'POST',
        body: JSON.stringify({ promo_codes: promoCodes }),
        headers: buildAuthHeaders(authToken),
      }
    )
    return response.cart
  } catch (error) {
    if (isInvalidPromotionCodeError(error)) {
      return getCart(cartId)
    }

    storeLogger.error`Failed to add cart promotions: ${error}`
    return null
  }
}

/**
 * Update cart (email, addresses)
 *
 * `authToken` is the caller's Medusa customer JWT, forwarded as Bearer auth for
 * the same reason as `createCart`: it lets Medusa keep/set `cart.customer_id`
 * from the auth context so the cart stays linked to the signed-in customer
 * (see #284). Optional so anonymous/mock callers keep working.
 */
export async function updateCart(
  cartId: string,
  input: UpdateCartInput,
  authToken?: string | null
): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>(`/store/carts/${cartId}`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: buildAuthHeaders(authToken),
    })
    return response.cart
  } catch (error) {
    storeLogger.error`Failed to update cart: ${error}`
    return null
  }
}

/**
 * Payment Collection response type for Medusa v2
 */
interface PaymentCollectionResponse {
  payment_collection: {
    id: string
    currency_code: string
    amount: number
    status?: string
    payment_sessions?: Array<{
      id: string
      provider_id: string
      status: string
      data?: {
        client_secret?: string
        id?: string
        [key: string]: unknown
      }
    }>
  }
}

/**
 * Create a payment collection for a cart (Medusa v2)
 * Called once during checkout initialization.
 *
 * `authToken` is the caller's Medusa customer JWT. When present it is forwarded
 * as Bearer auth so Medusa resolves `auth_context.actor_id` to the signed-in
 * customer — the same reason it matters on `createPaymentSession` (see there).
 * Optional so anonymous/mock callers keep working with the publishable key only.
 */
export async function createPaymentCollection(
  cartId: string,
  authToken?: string | null
): Promise<PaymentCollectionResponse['payment_collection'] | null> {
  try {
    const response = await medusaFetch<PaymentCollectionResponse>(
      '/store/payment-collections',
      {
        method: 'POST',
        body: JSON.stringify({ cart_id: cartId }),
        headers: buildAuthHeaders(authToken),
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
 *
 * `authToken` is the caller's Medusa customer JWT. Forwarding it as Bearer auth
 * is what makes Medusa attach a persistent Stripe Customer to the PaymentIntent
 * instead of a throwaway "Guest": the store payment-sessions route derives
 * `customer_id` from `auth_context.actor_id`, and Medusa's create-payment-session
 * workflow only creates/links a Stripe account holder `when("customer-id-exists")`.
 * Without the token the request is publishable-key-only, `actor_id` is empty, and
 * no `cus_...` is attached. Optional so anonymous/mock callers still work.
 */
export async function createPaymentSession(
  paymentCollectionId: string,
  providerId: string,
  authToken?: string | null,
  data?: Record<string, unknown>
): Promise<PaymentSessionResult | null> {
  try {
    // Resolve once: the selected backend and its credential must come from the
    // same host decision. Secrets stay out of the public StoreEnvironment map.
    const storeEnv = await getRequestStoreEnvironment()
    const gatewaySecret = getCheckoutGatewaySecret(storeEnv)
    if (!gatewaySecret) {
      storeLogger.error`Payment session creation blocked: checkout gateway secret is not configured`
      return null
    }

    const response = await medusaFetch<PaymentCollectionResponse>(
      `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({
          provider_id: providerId,
          ...(data ? { data } : {}),
        }),
        headers: buildAuthHeaders(authToken),
      },
      storeEnv
    )

    const paymentSession = response.payment_collection.payment_sessions?.find(
      (s) => s.provider_id === providerId
    )
    return {
      clientSecret: paymentSession?.data?.client_secret || null,
      paymentSessionId: paymentSession?.id || null,
    }
  } catch (error) {
    storeLogger.error`Failed to create payment session: ${error}`
    return null
  }
}

/**
 * Mint a Stripe CustomerSession for the cart (Medusa custom route).
 *
 * Returns the `customer_session_client_secret` the storefront hands to
 * `<Elements>` so Stripe renders its optional "save my card" checkbox. The
 * backend only mints one for yearly carts with an attached Stripe customer, and
 * returns null otherwise — a null here (or any failure) just means "no
 * checkbox", never a checkout error.
 */
export async function createCustomerSession(
  cartId: string,
  authToken?: string | null
): Promise<string | null> {
  try {
    const response = await medusaFetch<{
      customer_session_client_secret: string | null
    }>(`/store/carts/${cartId}/customer-session`, {
      method: 'POST',
      headers: buildAuthHeaders(authToken),
    })
    return response.customer_session_client_secret ?? null
  } catch (error) {
    storeLogger.error`Failed to create customer session: ${error}`
    return null
  }
}

/**
 * Capture a PayPal order for a cart using the Medusa backend's PayPal
 * credentials/environment.
 */
export async function capturePayPalOrder(
  cartId: string,
  orderId: string,
  authToken?: string | null
): Promise<boolean> {
  try {
    const response = await medusaFetch<{ order_id: string; status: string }>(
      `/store/carts/${cartId}/paypal/capture`,
      {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
        headers: buildAuthHeaders(authToken),
      }
    )
    return response.status === 'COMPLETED'
  } catch (error) {
    storeLogger.error`Failed to capture PayPal order: ${error}`
    return false
  }
}

/**
 * Complete a cart (finalize payment and create order)
 *
 * `authToken` is the caller's Medusa customer JWT, forwarded as Bearer auth for
 * the same reason as `createCart`/`updateCart`: completing a now-customer-linked
 * cart must carry the matching auth context so Medusa lets the owning customer
 * finalize it (and links the created order to that customer). Optional so
 * anonymous/mock callers keep working with the publishable key only (see #284).
 */
export async function completeCart(
  cartId: string,
  authToken?: string | null
): Promise<CompleteCartResponse | null> {
  try {
    const response = await medusaFetch<CompleteCartResponse>(
      `/store/carts/${cartId}/complete`,
      {
        method: 'POST',
        headers: buildAuthHeaders(authToken),
      }
    )
    return response
  } catch (error) {
    storeLogger.error`Failed to complete cart: ${error}`
    return null
  }
}
