import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/env', () => ({
  env: { MEDUSA_ADMIN_API_TOKEN: 'admin-token' },
}))
vi.mock('@/lib/store-environment', () => ({
  getLiveStoreEnvironment: () => ({ medusaBackendUrl: 'https://api.test' }),
}))

import { findAdminCustomerByEmail, getAdminCustomerById } from './medusa-admin'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
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
  })
})
