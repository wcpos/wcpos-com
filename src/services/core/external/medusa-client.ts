import 'server-only'

import {
  getRequestStoreEnvironment,
  type StoreEnvironment,
} from '@/lib/store-environment'
import { storeLogger } from '@/lib/logger'
import { getPlanByHandle } from '@/lib/plans'
import type {
  MedusaProduct,
  MedusaProductsResponse,
  MedusaProductResponse,
  MedusaRegionsResponse,
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
    throw new Error(`Medusa API error: ${response.status}`)
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

/**
 * Get WCPOS Pro license products specifically
 */
export async function getWcposProProducts(): Promise<MedusaProduct[]> {
  try {
    const response = await medusaFetch<MedusaProductsResponse>(
      '/store/products?fields=*variants.prices'
    )
    return response.products.filter((p) => getPlanByHandle(p.handle) !== null)
  } catch (error) {
    storeLogger.error`Failed to fetch WCPOS Pro products: ${error}`
    return []
  }
}

/**
 * Get a single product by handle
 */
export async function getProductByHandle(
  handle: string
): Promise<MedusaProduct | null> {
  try {
    const response = await medusaFetch<MedusaProductsResponse>(
      `/store/products?handle=${handle}&fields=*variants.prices`
    )

    return response.products[0] || null
  } catch (error) {
    storeLogger.error`Failed to fetch product ${handle}: ${error}`
    return null
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(
  id: string
): Promise<MedusaProduct | null> {
  try {
    const response = await medusaFetch<MedusaProductResponse>(
      `/store/products/${id}?fields=*variants.prices`
    )

    return response.product || null
  } catch (error) {
    storeLogger.error`Failed to fetch product ${id}: ${error}`
    return null
  }
}

/**
 * Get available regions
 */
export async function getRegions(): Promise<MedusaRegionsResponse['regions']> {
  try {
    const response = await medusaFetch<MedusaRegionsResponse>('/store/regions')
    return response.regions
  } catch (error) {
    storeLogger.error`Failed to fetch regions: ${error}`
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
    payment_providers?: Array<{ id: string; is_enabled?: boolean }>
  }

  try {
    const response = await medusaFetch<{ regions: RegionWithProviders[] }>(
      '/store/regions?fields=id,name,*payment_providers',
      {},
      storeEnv
    )
    const regions = response.regions ?? []
    // Checkout passes this region_id when creating the cart, so provider
    // filtering and the cart's region stay coupled even if Medusa's implicit
    // default region differs from /store/regions order.
    const cartRegion: RegionWithProviders | undefined = regions[0]
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

export async function getEnabledPaymentProviderIds(
  storeEnv?: StoreEnvironment
): Promise<string[] | null> {
  const { providerIds } = await getCartPaymentProviderContext(storeEnv)
  return providerIds
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount)
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
 */
export async function createCart(input: CreateCartInput = {}): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>('/store/carts', {
      method: 'POST',
      body: JSON.stringify(input),
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
 */
export async function addLineItem(
  cartId: string,
  item: AddLineItemInput
): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>(
      `/store/carts/${cartId}/line-items`,
      {
        method: 'POST',
        body: JSON.stringify(item),
      }
    )
    return response.cart
  } catch (error) {
    storeLogger.error`Failed to add line item: ${error}`
    return null
  }
}

/**
 * Update cart (email, addresses)
 */
export async function updateCart(
  cartId: string,
  input: UpdateCartInput
): Promise<MedusaCart | null> {
  try {
    const response = await medusaFetch<MedusaCartResponse>(`/store/carts/${cartId}`, {
      method: 'POST',
      body: JSON.stringify(input),
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
  authToken?: string | null
): Promise<PaymentSessionResult | null> {
  try {
    const response = await medusaFetch<PaymentCollectionResponse>(
      `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ provider_id: providerId }),
        headers: buildAuthHeaders(authToken),
      }
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
    await medusaFetch<{ order_id: string; status: string }>(
      `/store/carts/${cartId}/paypal/capture`,
      {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
        headers: buildAuthHeaders(authToken),
      }
    )
    return true
  } catch (error) {
    storeLogger.error`Failed to capture PayPal order: ${error}`
    return false
  }
}

/**
 * Complete a cart (finalize payment and create order)
 */
export async function completeCart(cartId: string): Promise<CompleteCartResponse | null> {
  try {
    const response = await medusaFetch<CompleteCartResponse>(
      `/store/carts/${cartId}/complete`,
      {
        method: 'POST',
      }
    )
    return response
  } catch (error) {
    storeLogger.error`Failed to complete cart: ${error}`
    return null
  }
}

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
  capturePayPalOrder,
  completeCart,
}
