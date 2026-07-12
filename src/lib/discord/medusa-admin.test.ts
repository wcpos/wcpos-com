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
  listAdminCustomerOrders,
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

describe('admin auth header', () => {
  it('authenticates with HTTP Basic (secret key as username), not Bearer', async () => {
    fetchMock.mockResolvedValueOnce(ok({ customers: [] }))
    await findAdminCustomerByEmail('a@b.com')

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const auth = (init.headers as Record<string, string>).Authorization
    expect(auth.startsWith('Basic ')).toBe(true)
    // Medusa v2 rejects Bearer for API keys; the key is the Basic username.
    const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf-8')
    expect(decoded).toBe('admin-token:')
  })
})

describe('findAdminCustomerByEmail', () => {
  it('queries broadly by normalized email and accepts an exact mixed-case result', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        customers: [
          {
            id: 'cus_1',
            email: 'CadenceChatfield@example.com',
            has_account: true,
          },
        ],
      })
    )
    const customer = await findAdminCustomerByEmail(
      '  cadencechatfield@EXAMPLE.COM '
    )

    expect(customer?.id).toBe('cus_1')
    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.pathname).toBe('/admin/customers')
    expect(url.searchParams.get('q')).toBe('cadencechatfield@example.com')
    expect(url.searchParams.has('email')).toBe(false)
    expect(url.searchParams.get('limit')).toBe('100')
  })

  it('returns null when no customer matches', async () => {
    fetchMock.mockResolvedValueOnce(ok({ customers: [] }))
    expect(await findAdminCustomerByEmail('missing@b.com')).toBeNull()
  })

  it('prefers a registered customer when guest and account emails collide', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        customers: [
          { id: 'partial', email: 'prefix-a@b.com', has_account: true },
          { id: 'guest', email: 'A@B.com', has_account: false },
          { id: 'registered', email: 'a@b.com', has_account: true },
        ],
      })
    )

    const customer = await findAdminCustomerByEmail('a@b.com')

    expect(customer?.id).toBe('registered')
  })

  it('does not fall back to a partial q match', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        customers: [
          {
            id: 'partial',
            email: 'cadencechatfield+old@example.com',
            has_account: true,
          },
        ],
      })
    )

    expect(
      await findAdminCustomerByEmail('cadencechatfield@example.com')
    ).toBeNull()
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

describe('admin order fields', () => {
  // /admin/orders omits email/currency_code/subtotal/tax_total by default;
  // the account pages need them (undefined currency_code threw and broke the
  // Orders page under "view as"). Both order fetchers must request them.
  it('listAdminCustomerOrders requests currency_code, email and items', async () => {
    fetchMock.mockResolvedValueOnce(ok({ orders: [] }))
    await listAdminCustomerOrders('cus_1')
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('fields=')
    expect(decodeURIComponent(url)).toContain('currency_code')
    expect(decodeURIComponent(url)).toContain('email')
    expect(decodeURIComponent(url)).toContain('*items')
  })

  it('getAdminCustomerOrderById requests currency_code and email', async () => {
    fetchMock.mockResolvedValueOnce(ok({ orders: [{ id: 'ord_1' }] }))
    await getAdminCustomerOrderById('cus_1', 'ord_1')
    const url = decodeURIComponent(fetchMock.mock.calls[0][0] as string)
    expect(url).toContain('currency_code')
    expect(url).toContain('email')
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

  it('returns null and logs when the admin order lookup fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'down' } as Response)

    expect(await getAdminCustomerOrderById('cus_1', 'ord_1')).toBeNull()
    expect(mockInfraError).toHaveBeenCalledTimes(1)
  })
})
