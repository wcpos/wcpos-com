import 'server-only'

import { env } from '@/utils/env'
import { storeLogger } from '@/lib/logger'
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
 * Make a request to the Medusa Store API
 */
async function medusaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${env.MEDUSA_BACKEND_URL}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge any headers from options
  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>
    Object.assign(headers, optHeaders)
  }

  // Add publishable API key if available
  if (env.MEDUSA_PUBLISHABLE_KEY) {
    headers['x-publishable-api-key'] = env.MEDUSA_PUBLISHABLE_KEY
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    storeLogger.error`API error: ${response.status}`
    throw new Error(`Medusa API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Get all published products
 */
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

/**
 * Get WCPOS Pro license products specifically
 */
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
  completeCart,
}
