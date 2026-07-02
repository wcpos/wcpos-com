import 'server-only'

import { env } from '@/utils/env'
import { getLiveStoreEnvironment } from '@/lib/store-environment'
import type { MedusaOrder } from '@/lib/customer-orders'
import type { MedusaCustomer } from '@/lib/medusa-auth'

interface AdminCustomersResponse {
  customers?: MedusaCustomer[]
}

interface AdminOrdersResponse {
  orders?: MedusaOrder[]
}

function requireAdminToken(): string {
  if (!env.MEDUSA_ADMIN_API_TOKEN) {
    throw new Error('MEDUSA_ADMIN_API_TOKEN is required for Discord reconciliation')
  }
  return env.MEDUSA_ADMIN_API_TOKEN
}

async function medusaAdminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Discord role-sync reconciles LIVE business data — it runs from webhooks
  // and cron with no meaningful request host, so it is pinned to live rather
  // than host-resolved.
  const response = await fetch(`${getLiveStoreEnvironment().medusaBackendUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireAdminToken()}`,
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
