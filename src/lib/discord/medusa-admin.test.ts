import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockInfraError } = vi.hoisted(() => ({
  mockInfraError: vi.fn(),
}))

vi.mock('@/utils/env', () => ({
  env: { MEDUSA_ADMIN_API_TOKEN: 'admin-token' },
}))
vi.mock('@/lib/store-environment', () => ({
  getLiveStoreEnvironment: () => ({ medusaBackendUrl: 'https://api.test' }),
}))
vi.mock('@/lib/logger', () => ({
  infraLogger: { error: mockInfraError },
}))

import {
  findAdminCustomerByEmail,
  getAdminCustomerById,
  getAdminCustomerOrderById,
} from './medusa-admin'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
  mockInfraError.mockReset()
})

function ok(body: unknown) {
  return { ok: true, json: async () => body } as Response
}

describe('findAdminCustomerByEmail', () => {
  it('queries /admin/customers by email and returns the first match', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ customers: [{ id: 'cus_1', email: 'a@b.com' }] })
    )
    const customer = await findAdminCustomerByEmail('a@b.com')
    expect(customer?.id).toBe('cus_1')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/admin/customers?')
    expect(url).toContain('a%40b.com')
  })

  it('returns null when no customer matches', async () => {
    fetchMock.mockResolvedValueOnce(ok({ customers: [] }))
    expect(await findAdminCustomerByEmail('missing@b.com')).toBeNull()
  })

  it('prefers a registered customer when guest and account emails collide', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        customers: [
          { id: 'guest', email: 'a@b.com', has_account: false },
          { id: 'registered', email: 'a@b.com', has_account: true },
        ],
      })
    )

    const customer = await findAdminCustomerByEmail('a@b.com')

    expect(customer?.id).toBe('registered')
    expect(fetchMock.mock.calls[0][0]).toContain('limit=2')
  })

  it('returns null and logs when the admin lookup fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'down' } as Response)

    expect(await findAdminCustomerByEmail('a@b.com')).toBeNull()
    expect(mockInfraError).toHaveBeenCalledTimes(1)
  })
})

describe('getAdminCustomerById', () => {
  it('fetches /admin/customers/:id', async () => {
    fetchMock.mockResolvedValueOnce(ok({ customer: { id: 'cus_9' } }))
    const customer = await getAdminCustomerById('cus_9')
    expect(customer?.id).toBe('cus_9')
    expect(fetchMock.mock.calls[0][0]).toContain('/admin/customers/cus_9')
  })

  it('returns null on a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'nope' } as Response)
    expect(await getAdminCustomerById('cus_x')).toBeNull()
    expect(mockInfraError).toHaveBeenCalledTimes(1)
  })
})

describe('getAdminCustomerOrderById', () => {
  it('fetches a single customer order by id', async () => {
    fetchMock.mockResolvedValueOnce(ok({ orders: [{ id: 'ord_1' }] }))

    const order = await getAdminCustomerOrderById('cus_1', 'ord_1')

    expect(order?.id).toBe('ord_1')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/admin/orders?')
    expect(url).toContain('customer_id=cus_1')
    expect(url).toContain('id=ord_1')
    expect(url).toContain('limit=1')
  })

  it('returns null when the returned order id does not match', async () => {
    fetchMock.mockResolvedValueOnce(ok({ orders: [{ id: 'ord_other' }] }))

    expect(await getAdminCustomerOrderById('cus_1', 'ord_1')).toBeNull()
  })
})
