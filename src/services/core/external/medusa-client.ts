import 'server-only'

import { env } from '@/utils/env'
import type {
  MedusaProduct,
  MedusaProductsResponse,
  MedusaProductResponse,
  MedusaRegionsResponse,
} from '@/types/medusa'

/**
 * Medusa Client
 *
 * Server-side client for the MedusaJS Store API.
 * Used to fetch products and manage cart/checkout for the /pro page.
 */

/**
 * Cache for products to reduce API calls
 */
const productCache = new Map<string, { data: MedusaProduct[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Make a request to the Medusa Store API
 */
async function medusaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${env.MEDUSA_BACKEND_URL}${endpoint}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
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
    const errorText = await response.text()
    console.error(`[MedusaClient] API error: ${response.status} ${errorText}`)
    throw new Error(`Medusa API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Get all published products
 */
export async function getProducts(): Promise<MedusaProduct[]> {
  try {
    // Check cache first
    const cached = productCache.get('all')
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }

    const response = await medusaFetch<MedusaProductsResponse>(
      '/store/products?status=published&fields=*variants.prices'
    )

    // Update cache
    productCache.set('all', {
      data: response.products,
      timestamp: Date.now(),
    })

    return response.products
  } catch (error) {
    console.error('[MedusaClient] Failed to fetch products:', error)
    return []
  }
}

/**
 * Get WCPOS Pro license products specifically
 */
export async function getWcposProProducts(): Promise<MedusaProduct[]> {
  try {
    // Check cache first
    const cached = productCache.get('wcpos-pro')
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }

    // Fetch products with wcpos-pro handle prefix
    const response = await medusaFetch<MedusaProductsResponse>(
      '/store/products?status=published&fields=*variants.prices'
    )

    // Filter to only WCPOS Pro products
    const wcposProducts = response.products.filter(
      (p) => p.handle?.startsWith('wcpos-pro-')
    )

    // Update cache
    productCache.set('wcpos-pro', {
      data: wcposProducts,
      timestamp: Date.now(),
    })

    return wcposProducts
  } catch (error) {
    console.error('[MedusaClient] Failed to fetch WCPOS Pro products:', error)
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
    console.error(`[MedusaClient] Failed to fetch product ${handle}:`, error)
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
    console.error(`[MedusaClient] Failed to fetch product ${id}:`, error)
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
    console.error('[MedusaClient] Failed to fetch regions:', error)
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

/**
 * Clear the product cache (useful for testing or manual refresh)
 */
export function clearProductCache(): void {
  productCache.clear()
}

export const medusaClient = {
  getProducts,
  getWcposProProducts,
  getProductByHandle,
  getProductById,
  getRegions,
  formatPrice,
  getVariantPrice,
  clearProductCache,
}
