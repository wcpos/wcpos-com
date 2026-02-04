import sdk from '@medusajs/js-sdk'

/**
 * MedusaJS Client Configuration
 * 
 * This client handles all communication with the MedusaJS backend
 * for customer management, orders, and authentication.
 */

// Initialize the MedusaJS SDK
export const medusaClient = new sdk({
  baseUrl: process.env.MEDUSA_API_URL || 'https://store-api.wcpos.com',
  debug: process.env.NODE_ENV === 'development',
  auth: {
    type: 'session', // Use session-based auth for customers
  },
})

// Types for better TypeScript support
export interface MedusaCustomer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  has_account: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
  addresses?: MedusaAddress[]
  orders?: MedusaOrder[]
}

export interface MedusaAddress {
  id: string
  customer_id: string
  first_name?: string
  last_name?: string
  phone?: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  country_code: string
  province?: string
  postal_code: string
  metadata?: Record<string, unknown>
}

export interface MedusaOrder {
  id: string
  status: string
  fulfillment_status: string
  payment_status: string
  display_id: number
  cart_id: string
  customer_id: string
  email: string
  currency_code: string
  total: number
  subtotal: number
  tax_total: number
  shipping_total: number
  created_at: string
  updated_at: string
  items: MedusaOrderItem[]
  metadata?: Record<string, unknown>
}

export interface MedusaOrderItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  quantity: number
  unit_price: number
  total: number
  variant: {
    id: string
    title: string
    sku?: string
    product: {
      id: string
      title: string
      handle: string
      thumbnail?: string
    }
  }
}

export default medusaClient