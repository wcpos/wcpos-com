import 'server-only'

import { env } from '@/utils/env'
import { getLiveStoreEnvironment } from '@/lib/store-environment'
import { infraLogger } from '@/lib/logger'
import type { MedusaOrder } from '@/lib/customer-orders'
import type { MedusaCustomer } from '@/lib/medusa-auth'

interface AdminCustomersResponse {
  customers?: MedusaCustomer[]
}

interface AdminOrdersResponse {
  orders?: MedusaOrder[]
}

// The account order pages (projection, receipts, license extraction) read these
// off each order. Unlike `/store/orders`, `/admin/orders` does NOT return
// `email`, `currency_code`, `subtotal`, or `tax_total` by default — omitting
// them left `currency_code` undefined, which threw when formatting money and
// broke the whole Orders page under "view as". `*items` expands the line items
// (with their `metadata`); order `metadata` carries the license references.
const ADMIN_ORDER_FIELDS =
  'id,display_id,created_at,updated_at,email,currency_code,total,subtotal,tax_total,status,payment_status,fulfillment_status,metadata,*items'
const ADMIN_ORDER_RECEIPT_FIELDS = `${ADMIN_ORDER_FIELDS},*billing_address`

function requireAdminToken(): string {
  if (!env.MEDUSA_ADMIN_API_TOKEN) {
    throw new Error('MEDUSA_ADMIN_API_TOKEN is required for Discord reconciliation')
  }
  return env.MEDUSA_ADMIN_API_TOKEN
}

async function medusaAdminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Medusa v2 admin API keys authenticate via HTTP Basic auth (the secret key
  // is the username, password empty) — the framework rejects `Bearer` for API
  // keys (`Bearer` is only for short-lived user JWTs, which can't serve as a
  // static env token). See @medusajs/framework authenticate-middleware
  // getApiKeyInfo: it requires `tokenType === 'basic'`.
  const basicCredential = Buffer.from(`${requireAdminToken()}:`).toString('base64')

  // Discord role-sync reconciles LIVE business data — it runs from webhooks
  // and cron with no meaningful request host, so it is pinned to live rather
  // than host-resolved.
  const response = await fetch(`${getLiveStoreEnvironment().medusaBackendUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicCredential}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Medusa Admin API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

export async function listAdminCustomers(
  batchSize: number = 100,
  maxBatches: number = 100
): Promise<MedusaCustomer[]> {
  const customers: MedusaCustomer[] = []

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const query = new URLSearchParams({
      limit: String(batchSize),
      offset: String(batch * batchSize),
      fields: 'id,email,first_name,last_name,metadata,created_at,updated_at',
    })

    const page = await medusaAdminFetch<AdminCustomersResponse>(
      `/admin/customers?${query.toString()}`
    )
    const pageCustomers = page.customers ?? []
    customers.push(...pageCustomers)

    if (pageCustomers.length < batchSize) break
  }

  return customers
}

export async function listAdminCustomerOrders(
  customerId: string,
  batchSize: number = 100,
  maxBatches: number = 50
): Promise<MedusaOrder[]> {
  const orders: MedusaOrder[] = []

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const query = new URLSearchParams({
      limit: String(batchSize),
      offset: String(batch * batchSize),
      customer_id: customerId,
      fields: ADMIN_ORDER_FIELDS,
    })

    const page = await medusaAdminFetch<AdminOrdersResponse>(
      `/admin/orders?${query.toString()}`
    )
    const pageOrders = page.orders ?? []
    orders.push(...pageOrders)

    if (pageOrders.length < batchSize) break
  }

  return orders
}

export async function getAdminCustomerOrderById(
  customerId: string,
  orderId: string
): Promise<MedusaOrder | null> {
  const query = new URLSearchParams({
    limit: '1',
    customer_id: customerId,
    id: orderId,
    fields: ADMIN_ORDER_RECEIPT_FIELDS,
  })

  try {
    const page = await medusaAdminFetch<AdminOrdersResponse>(
      `/admin/orders?${query.toString()}`
    )
    const [order] = page.orders ?? []
    return order?.id === orderId ? order : null
  } catch (error) {
    infraLogger.error`Failed to fetch admin order ${orderId} for customer ${customerId}: ${error}`
    return null
  }
}

interface AdminCustomerResponse {
  customer?: MedusaCustomer
}

/**
 * Find a single customer by exact email via the admin API. Returns null when
 * there is no match. Medusa's `email` filter is case-sensitive, so query with
 * `q` and discard every result that is not an exact normalized match.
 */
export async function findAdminCustomerByEmail(
  email: string
): Promise<MedusaCustomer | null> {
  const needle = email.trim().toLowerCase()
  const query = new URLSearchParams({
    q: needle,
    limit: '100',
    fields: 'id,email,first_name,last_name,phone,has_account,metadata,created_at,updated_at',
  })
  try {
    const page = await medusaAdminFetch<AdminCustomersResponse>(
      `/admin/customers?${query.toString()}`
    )
    const exact = (page.customers ?? []).filter(
      (customer) => customer.email.trim().toLowerCase() === needle
    )
    return exact.find((customer) => customer.has_account) ?? exact[0] ?? null
  } catch (error) {
    infraLogger.error`Failed to find admin customer by email: ${error}`
    return null
  }
}

/**
 * Fetch one customer by id via the admin API. Returns null if not found.
 */
export async function getAdminCustomerById(
  id: string
): Promise<MedusaCustomer | null> {
  const query = new URLSearchParams({
    // *addresses keeps parity with /store/customers/me: the account area
    // renders billing details from the default billing address, including
    // during read-only inspection (view-as).
    fields:
      'id,email,first_name,last_name,phone,has_account,metadata,created_at,updated_at,*addresses',
  })
  try {
    const data = await medusaAdminFetch<AdminCustomerResponse>(
      `/admin/customers/${id}?${query.toString()}`
    )
    return data.customer ?? null
  } catch (error) {
    infraLogger.error`Failed to fetch admin customer ${id}: ${error}`
    return null
  }
}
