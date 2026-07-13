/**
 * Medusa Store API Types
 *
 * Types for interacting with the MedusaJS Store API.
 * Based on MedusaJS v2 API responses.
 */

export interface MedusaPrice {
  id: string
  currency_code: string
  amount: number
  min_quantity?: number | null
  max_quantity?: number | null
}

export interface MedusaProductVariant {
  id: string
  title: string
  sku: string | null
  prices: MedusaPrice[]
  options: Record<string, string>
  manage_inventory: boolean
  metadata?: Record<string, unknown>
}

export interface MedusaProductImage {
  id: string
  url: string
}

export interface MedusaProduct {
  id: string
  title: string
  handle: string
  description: string | null
  status: 'draft' | 'proposed' | 'published' | 'rejected'
  thumbnail: string | null
  images: MedusaProductImage[]
  variants: MedusaProductVariant[]
  options: Array<{
    id: string
    title: string
    values: string[]
  }>
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MedusaProductsResponse {
  products: MedusaProduct[]
  count: number
  offset: number
  limit: number
}

export interface MedusaProductResponse {
  product: MedusaProduct
}

export interface MedusaCart {
  id: string
  email?: string
  region_id: string
  currency_code: string
  /** Set once the cart has been turned into an order (Medusa keeps the cart). */
  completed_at?: string | null
  items: MedusaCartItem[]
  subtotal: number
  discount_total?: number
  tax_total: number
  total: number
  promotions?: Array<{
    code: string
  }>
  payment_sessions?: MedusaPaymentSession[]
  /** Medusa v2: the cart's payment container (one per cart). */
  payment_collection?: {
    id: string
    payment_sessions?: MedusaPaymentSession[]
  }
}

export interface MedusaCartItem {
  id: string
  title: string
  description: string | null
  quantity: number
  unit_price: number
  original_total?: number
  subtotal: number
  total: number
  variant_id: string
  variant: MedusaProductVariant
}

export interface MedusaPaymentSession {
  id: string
  provider_id: string
  status: string
  data: Record<string, unknown>
}

export interface MedusaCartResponse {
  cart: MedusaCart
}

export interface MedusaRegion {
  id: string
  name: string
  currency_code: string
  countries: Array<{
    iso_2: string
    name: string
  }>
}

export interface MedusaRegionsResponse {
  regions: MedusaRegion[]
}

// Cart creation/update types
export interface CreateCartInput {
  region_id?: string
  email?: string
  metadata?: Record<string, unknown>
  items?: Array<{
    variant_id: string
    quantity: number
  }>
}

export interface AddLineItemInput {
  variant_id: string
  quantity: number
}

export interface UpdateCartInput {
  email?: string
  billing_address?: MedusaAddress
  shipping_address?: MedusaAddress
  /** Merged into existing cart metadata by Medusa (never replaces it). */
  metadata?: Record<string, unknown>
}

export interface MedusaAddress {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  country_code?: string
  province?: string
  postal_code?: string
  phone?: string
}

export interface MedusaPaymentCollection {
  id: string
  status: string
  payment_sessions: MedusaPaymentSession[]
}

export interface MedusaOrder {
  id: string
  status: string
  email: string
  currency_code: string
  total: number
  items: MedusaCartItem[]
  created_at: string
}

export interface MedusaOrderResponse {
  order: MedusaOrder
}

export interface CompleteCartResponse {
  type: 'order' | 'cart' | 'swap'
  order?: MedusaOrder
  cart?: MedusaCart
}
