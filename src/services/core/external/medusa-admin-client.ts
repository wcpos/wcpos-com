import 'server-only'

import { env } from '@/utils/env'
import { adminLogger } from '@/lib/logger'

/**
 * Medusa Admin Client — READ-ONLY access to the Medusa Admin API for the
 * wcpos-com admin area (customers and orders browsers).
 *
 * Auth: Medusa v2 secret API keys (sk_...) authenticate admin routes via
 * HTTP Basic with the key as the username and an empty password — see
 * `getApiKeyInfo` in @medusajs/framework's authenticate middleware
 * (verified against the deployed backend's version, 2.13.1).
 *
 * MEDUSA_ADMIN_API_KEY is optional: when unset, every function returns
 * `{ status: 'unconfigured' }` and pages render a "not configured" card
 * (same pattern as the Loki logs viewer). Configuration and fetch problems
 * are reported through discriminated unions — these functions never throw.
 *
 * Responses are mapped onto minimal typed shapes; raw Medusa payloads never
 * reach pages, and raw upstream error bodies are never returned (only the
 * HTTP status), so error messages are safe to render.
 */

const DEFAULT_PAGE_SIZE = 20

// ---- Mapped (page-facing) shapes ----

export interface AdminCustomerSummary {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  hasAccount: boolean
  createdAt: string | null
}

export interface AdminCustomerDetail extends AdminCustomerSummary {
  companyName: string | null
  phone: string | null
  metadata: Record<string, unknown> | null
  updatedAt: string | null
}

export interface AdminOrderSummary {
  id: string
  displayId: number | null
  status: string
  /** Aggregated by Medusa's order workflows (e.g. captured, refunded). */
  paymentStatus: string | null
  email: string | null
  currencyCode: string
  total: number
  customerId: string | null
  createdAt: string | null
  /** Order-level metadata; the backend stores license references here. */
  metadata: Record<string, unknown> | null
}

export interface AdminOrderItemSummary {
  id: string
  title: string
  quantity: number
  unitPrice: number | null
  total: number | null
  metadata: Record<string, unknown> | null
}

export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: number | null
  taxTotal: number | null
  items: AdminOrderItemSummary[]
}

// ---- Result unions ----

export type MedusaAdminListResult<T> =
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }
  | {
      status: 'ok'
      items: T[]
      count: number
      page: number
      pageSize: number
      hasNextPage: boolean
    }

export type MedusaAdminItemResult<T> =
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }
  | { status: 'not_found' }
  | { status: 'ok'; item: T }

// ---- Raw Medusa response shapes (defensive: everything optional) ----

interface MedusaAdminCustomer {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  phone?: string | null
  has_account?: boolean
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

interface MedusaAdminOrderItem {
  id: string
  title?: string | null
  quantity?: number
  unit_price?: number
  total?: number
  metadata?: Record<string, unknown> | null
}

interface MedusaAdminOrder {
  id: string
  display_id?: number
  status?: string
  payment_status?: string | null
  email?: string | null
  currency_code?: string | null
  total?: number
  subtotal?: number
  tax_total?: number
  customer_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  items?: MedusaAdminOrderItem[] | null
}

// ---- Mapping helpers ----

function mapCustomerSummary(customer: MedusaAdminCustomer): AdminCustomerSummary {
  return {
    id: customer.id,
    email: customer.email ?? null,
    firstName: customer.first_name ?? null,
    lastName: customer.last_name ?? null,
    hasAccount: Boolean(customer.has_account),
    createdAt: customer.created_at ?? null,
  }
}

function mapCustomerDetail(customer: MedusaAdminCustomer): AdminCustomerDetail {
  return {
    ...mapCustomerSummary(customer),
    companyName: customer.company_name ?? null,
    phone: customer.phone ?? null,
    metadata: customer.metadata ?? null,
    updatedAt: customer.updated_at ?? null,
  }
}

function mapOrderSummary(order: MedusaAdminOrder): AdminOrderSummary {
  return {
    id: order.id,
    displayId: typeof order.display_id === 'number' ? order.display_id : null,
    status: order.status ?? 'unknown',
    paymentStatus: order.payment_status ?? null,
    email: order.email ?? null,
    // Orders always carry a currency in Medusa; fall back to USD defensively.
    currencyCode: order.currency_code ?? 'usd',
    total: typeof order.total === 'number' ? order.total : 0,
    customerId: order.customer_id ?? null,
    createdAt: order.created_at ?? null,
    metadata: order.metadata ?? null,
  }
}

function mapOrderItem(item: MedusaAdminOrderItem): AdminOrderItemSummary {
  return {
    id: item.id,
    title: item.title ?? 'Unknown item',
    quantity: typeof item.quantity === 'number' ? item.quantity : 0,
    unitPrice: typeof item.unit_price === 'number' ? item.unit_price : null,
    total: typeof item.total === 'number' ? item.total : null,
    metadata: item.metadata ?? null,
  }
}

function mapOrderDetail(order: MedusaAdminOrder): AdminOrderDetail {
  return {
    ...mapOrderSummary(order),
    subtotal: typeof order.subtotal === 'number' ? order.subtotal : null,
    taxTotal: typeof order.tax_total === 'number' ? order.tax_total : null,
    items: (order.items ?? []).map(mapOrderItem),
  }
}

// ---- Fetch helper ----

export function isMedusaAdminConfigured(): boolean {
  return Boolean(env.MEDUSA_ADMIN_API_KEY)
}

type AdminFetchResult =
  | { kind: 'unconfigured' }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; json: unknown }

async function adminFetch(
  path: string,
  searchParams?: URLSearchParams
): Promise<AdminFetchResult> {
  const apiKey = env.MEDUSA_ADMIN_API_KEY
  if (!apiKey) {
    return { kind: 'unconfigured' }
  }

  const query = searchParams?.toString()
  const url = `${env.MEDUSA_BACKEND_URL}${path}${query ? `?${query}` : ''}`

  try {
    const res = await fetch(url, {
      headers: {
        // Medusa v2 secret API key auth: Basic, key as username, no password.
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        Accept: 'application/json',
      },
    })

    if (res.status === 404) {
      return { kind: 'not_found' }
    }

    if (!res.ok) {
      // Status code only — never surface the raw upstream body to pages.
      adminLogger.error`Medusa admin request failed (${res.status}) for ${path}`
      return {
        kind: 'error',
        message: `Medusa admin request failed (${res.status})`,
      }
    }

    return { kind: 'ok', json: await res.json() }
  } catch (error) {
    adminLogger.error`Medusa admin request error for ${path}: ${error}`
    return { kind: 'error', message: 'Medusa admin API is unreachable' }
  }
}

function listResultFromFetch(result: AdminFetchResult):
  | { done: { status: 'unconfigured' } | { status: 'error'; message: string } }
  | { done?: undefined; json: unknown } {
  if (result.kind === 'unconfigured') {
    return { done: { status: 'unconfigured' } }
  }
  if (result.kind === 'not_found') {
    // A 404 on a list endpoint is an upstream problem, not an empty list.
    return { done: { status: 'error', message: 'Medusa admin request failed (404)' } }
  }
  if (result.kind === 'error') {
    return { done: { status: 'error', message: result.message } }
  }
  return { json: result.json }
}

// ---- Public API ----

const CUSTOMER_LIST_FIELDS = 'id,email,first_name,last_name,has_account,created_at'
const CUSTOMER_DETAIL_FIELDS =
  'id,email,first_name,last_name,company_name,phone,has_account,metadata,created_at,updated_at'
// `+` adds to the route's default fields (email/currency/customer_id are not
// in Medusa's admin order defaults); payment_status is always aggregated by
// the order workflows.
const ORDER_EXTRA_FIELDS = '+email,+currency_code,+customer_id'

export interface ListCustomersOptions {
  page?: number
  pageSize?: number
  /** Free-text search (Medusa `q`: matches email / first / last name). */
  q?: string
}

/**
 * List customers, newest first.
 *
 * GET /admin/customers?limit&offset&order=-created_at[&q]
 */
async function listCustomers(
  options: ListCustomersOptions = {}
): Promise<MedusaAdminListResult<AdminCustomerSummary>> {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, q } = options

  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
    order: '-created_at',
    fields: CUSTOMER_LIST_FIELDS,
  })
  if (q) {
    params.set('q', q)
  }

  const fetched = listResultFromFetch(await adminFetch('/admin/customers', params))
  if (fetched.done) return fetched.done

  const json = fetched.json as {
    customers?: MedusaAdminCustomer[]
    count?: number
  }
  const items = (json.customers ?? []).map(mapCustomerSummary)
  const count = typeof json.count === 'number' ? json.count : items.length

  return {
    status: 'ok',
    items,
    count,
    page,
    pageSize,
    hasNextPage: (page - 1) * pageSize + items.length < count,
  }
}

/**
 * Get a single customer by id.
 *
 * GET /admin/customers/{id}
 */
async function getCustomerById(
  customerId: string
): Promise<MedusaAdminItemResult<AdminCustomerDetail>> {
  const params = new URLSearchParams({ fields: CUSTOMER_DETAIL_FIELDS })
  const result = await adminFetch(
    `/admin/customers/${encodeURIComponent(customerId)}`,
    params
  )

  if (result.kind === 'unconfigured') return { status: 'unconfigured' }
  if (result.kind === 'not_found') return { status: 'not_found' }
  if (result.kind === 'error') {
    return { status: 'error', message: result.message }
  }

  const json = result.json as { customer?: MedusaAdminCustomer }
  if (!json.customer) {
    return { status: 'error', message: 'Medusa admin returned an unexpected response' }
  }

  return { status: 'ok', item: mapCustomerDetail(json.customer) }
}

export interface ListOrdersOptions {
  page?: number
  pageSize?: number
  /** Restrict to a single customer's orders. */
  customerId?: string
}

/**
 * List orders, newest first.
 *
 * GET /admin/orders?limit&offset&order=-created_at[&customer_id]
 */
async function listOrders(
  options: ListOrdersOptions = {}
): Promise<MedusaAdminListResult<AdminOrderSummary>> {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, customerId } = options

  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
    order: '-created_at',
    fields: ORDER_EXTRA_FIELDS,
  })
  if (customerId) {
    params.set('customer_id', customerId)
  }

  const fetched = listResultFromFetch(await adminFetch('/admin/orders', params))
  if (fetched.done) return fetched.done

  const json = fetched.json as { orders?: MedusaAdminOrder[]; count?: number }
  const items = (json.orders ?? []).map(mapOrderSummary)
  const count = typeof json.count === 'number' ? json.count : items.length

  return {
    status: 'ok',
    items,
    count,
    page,
    pageSize,
    hasNextPage: (page - 1) * pageSize + items.length < count,
  }
}

/**
 * Get a single order by id, with items and totals.
 *
 * GET /admin/orders/{id}
 */
async function getOrderById(
  orderId: string
): Promise<MedusaAdminItemResult<AdminOrderDetail>> {
  const params = new URLSearchParams({ fields: ORDER_EXTRA_FIELDS })
  const result = await adminFetch(
    `/admin/orders/${encodeURIComponent(orderId)}`,
    params
  )

  if (result.kind === 'unconfigured') return { status: 'unconfigured' }
  if (result.kind === 'not_found') return { status: 'not_found' }
  if (result.kind === 'error') {
    return { status: 'error', message: result.message }
  }

  const json = result.json as { order?: MedusaAdminOrder }
  if (!json.order) {
    return { status: 'error', message: 'Medusa admin returned an unexpected response' }
  }

  return { status: 'ok', item: mapOrderDetail(json.order) }
}

export const medusaAdminClient = {
  listCustomers,
  getCustomerById,
  listOrders,
  getOrderById,
}
