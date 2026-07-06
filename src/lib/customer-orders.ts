import 'server-only'

import { getAuthToken } from '@/lib/medusa-auth'
import { storeLogger } from '@/lib/logger'
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
} from '@/lib/store-environment'
import { getImpersonation } from '@/lib/impersonation'
import {
  getAdminCustomerOrderById,
  listAdminCustomerOrders,
} from '@/lib/discord/medusa-admin'

// ============================================================================
// Types — the order shape this module owns
// ============================================================================

export interface MedusaOrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
  metadata?: Record<string, unknown>
  variant?: Record<string, unknown>
}

export interface MedusaOrder {
  id: string
  status: string
  payment_status?: string
  fulfillment_status?: string
  display_id: number
  email: string
  currency_code: string
  total: number
  subtotal: number
  tax_total: number
  created_at: string
  updated_at: string
  items: MedusaOrderItem[]
  metadata?: Record<string, unknown>
}

// ============================================================================
// Paging — owned ONCE
// ============================================================================

/** getAllOrders default window: 50 × 20 = up to 1000 orders before the cap. */
const DEFAULT_BATCH_SIZE = 50
const DEFAULT_MAX_BATCHES = 20

/** Authenticated store headers (Bearer token + publishable key). */
async function storeHeaders(token: string): Promise<HeadersInit> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-publishable-api-key': await getMedusaPublishableKey(),
  }
}

interface OrdersListResult {
  orders: MedusaOrder[]
  /** Total orders the customer has, per Medusa's pagination metadata. */
  count: number
}

/**
 * The single place that talks to Medusa's order LIST endpoint.
 * GET /store/orders?<query> — authenticated and customer-scoped by Medusa
 * (the route forces `customer_id` from the session), so every order it can
 * return already belongs to the current customer. Returns { orders: [],
 * count: 0 } on any failure.
 */
async function fetchOrders(
  token: string,
  query: URLSearchParams
): Promise<OrdersListResult> {
  try {
    const response = await fetch(
      `${await getMedusaBackendUrl()}/store/orders?${query.toString()}`,
      { headers: await storeHeaders(token) }
    )

    if (!response.ok) {
      return { orders: [], count: 0 }
    }

    const data = await response.json()
    return { orders: data.orders ?? [], count: data.count ?? 0 }
  } catch (error) {
    storeLogger.error`Failed to get orders: ${error}`
    return { orders: [], count: 0 }
  }
}

/**
 * When inspecting, all order reads must resolve the TARGET customer's orders
 * via the admin API (Medusa scopes /store/orders to the session's own
 * actor_id, so the session token would return the admin's orders). Returns the
 * full target order set, or null when not impersonating.
 */
async function fetchImpersonatedOrders(): Promise<MedusaOrder[] | null> {
  const impersonation = await getImpersonation()
  if (!impersonation) return null
  try {
    return await listAdminCustomerOrders(impersonation.targetId)
  } catch (error) {
    storeLogger.error`Failed to fetch impersonated orders: ${error}`
    return []
  }
}

async function fetchImpersonatedOrderById(
  orderId: string
): Promise<MedusaOrder | null | undefined> {
  const impersonation = await getImpersonation()
  if (!impersonation) return undefined
  try {
    return await getAdminCustomerOrderById(impersonation.targetId, orderId)
  } catch (error) {
    storeLogger.error`Failed to fetch impersonated order ${orderId}: ${error}`
    return null
  }
}

// ============================================================================
// Public interface
// ============================================================================

/** One page of the current customer's orders. Empty if unauthenticated. */
export async function getOrdersPage(
  limit: number = 10,
  offset: number = 0
): Promise<MedusaOrder[]> {
  const impersonated = await fetchImpersonatedOrders()
  if (impersonated) return impersonated.slice(offset, offset + limit)

  const token = await getAuthToken()
  if (!token) return []

  const { orders } = await fetchOrders(
    token,
    new URLSearchParams({ limit: String(limit), offset: String(offset) })
  )
  return orders
}

/**
 * Every order for the current customer, paged in batches. Empty if
 * unauthenticated. Bounded at batchSize × maxBatches (default ~1000) to cap
 * worst-case work. If Medusa's reported total (`count`) exceeds what we
 * actually fetched, orders were left unfetched — a warning is logged rather
 * than silently truncating. (Comparing against `count` — not "was the final
 * page full" — avoids a false alarm when the customer has exactly
 * batchSize × maxBatches orders.)
 */
export async function getAllOrders(
  batchSize: number = DEFAULT_BATCH_SIZE,
  maxBatches: number = DEFAULT_MAX_BATCHES
): Promise<MedusaOrder[]> {
  const impersonated = await fetchImpersonatedOrders()
  if (impersonated) return impersonated

  const token = await getAuthToken()
  if (!token) return []

  const orders: MedusaOrder[] = []
  let total = 0

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { orders: page, count } = await fetchOrders(
      token,
      new URLSearchParams({
        limit: String(batchSize),
        offset: String(batch * batchSize),
      })
    )
    total = count
    orders.push(...page)
    // A short (or empty) page means we reached the natural end — done.
    if (page.length < batchSize) return orders
  }

  // Fell out of the loop at the cap. Warn ONLY if Medusa says there are more
  // orders than we collected (genuine truncation, not the exact-cap boundary).
  if (total > orders.length) {
    storeLogger.warn`getAllOrders fetched ${orders.length} of ${total} orders (cap ${
      batchSize * maxBatches
    }); some orders were not fetched`
  }
  return orders
}

/**
 * One order by id for the current customer. Null if unauthenticated, or if no
 * order with that id belongs to the customer.
 *
 * SECURITY: deliberately uses the customer-scoped LIST endpoint with an `id`
 * filter (`GET /store/orders?id=<id>&limit=1`), NOT `GET /store/orders/{id}`.
 * Upstream Medusa's single-order retrieve route is not customer-scoped (no
 * `customer_id` filter, no `authenticate` middleware, carries a TODO about
 * auth), so fetching by raw id there would expose other customers' orders.
 * The list route forces `customer_id` from the session, so an id that isn't
 * the customer's simply returns an empty list → null. Still one request, no
 * page scan.
 */
export async function getOrderById(
  orderId: string
): Promise<MedusaOrder | null> {
  const impersonated = await fetchImpersonatedOrderById(orderId)
  if (impersonated !== undefined) return impersonated

  const token = await getAuthToken()
  if (!token) return null

  const { orders } = await fetchOrders(
    token,
    new URLSearchParams({ id: orderId, limit: '1' })
  )
  const [order] = orders
  return order?.id === orderId ? order : null
}
