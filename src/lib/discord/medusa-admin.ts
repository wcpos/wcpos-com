import 'server-only'

import { env } from '@/utils/env'
import type { MedusaCustomer, MedusaOrder } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'

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
  const response = await fetch(`${env.MEDUSA_BACKEND_URL}${path}`, {
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

export async function listCustomersWithDiscordLinks(): Promise<MedusaCustomer[]> {
  const customers = await listAdminCustomers()
  return customers.filter((customer) =>
    Boolean(customer.metadata?.discord_user_id)
  )
}

export async function findCustomerByDiscordUserId(
  discordUserId: string
): Promise<MedusaCustomer | null> {
  const customers = await listAdminCustomers()
  return customers.find(
    (customer) => customer.metadata?.discord_user_id === discordUserId
  ) ?? null
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

export async function safeListCustomersWithDiscordLinks(): Promise<MedusaCustomer[]> {
  try {
    return await listCustomersWithDiscordLinks()
  } catch (error) {
    authLogger.error`Failed to list Discord-linked customers: ${error}`
    throw error
  }
}
