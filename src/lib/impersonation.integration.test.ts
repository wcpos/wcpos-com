import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// Simulate: account header present, admin session, cookie → target.
// Hoisted so the mock factories below can close over shared state without
// tripping vitest's mock-hoisting (bare consts referenced in a factory throw).
const { state } = vi.hoisted(() => ({
  state: { header: '1' as string | null, cookie: 'cus_target' as string | null },
}))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (n: string) =>
      n === 'x-wcpos-account-request' ? state.header : null,
  }),
  cookies: async () => ({
    get: (n: string) =>
      n === 'wcpos-impersonate' && state.cookie
        ? { value: state.cookie }
        : undefined,
    set: vi.fn(),
    delete: vi.fn(() => {
      state.cookie = null
    }),
  }),
}))
vi.mock('@/lib/admin', () => ({
  isAdmin: (e?: string | null) => e === 'paul@kilbot.com',
}))
vi.mock('@/lib/medusa-auth', () => ({
  getSessionCustomer: async () => ({ email: 'paul@kilbot.com' }),
}))
vi.mock('@/lib/discord/medusa-admin', () => ({
  getAdminCustomerById: async (id: string) => ({ id, email: 'target@x.com' }),
  listAdminCustomerOrders: async () => [
    { id: 'ord_1', display_id: 1, metadata: { license_key: 'KEY-1' } },
  ],
}))

import { getImpersonation } from './impersonation'
import { getAllOrders } from './customer-orders'

beforeEach(() => {
  state.header = '1'
  state.cookie = 'cus_target'
})

describe('impersonation end-to-end (lib layer)', () => {
  it('resolves the target and returns the target orders', async () => {
    expect(await getImpersonation()).toEqual({
      adminEmail: 'paul@kilbot.com',
      targetId: 'cus_target',
    })
    const orders = await getAllOrders()
    expect(orders[0].id).toBe('ord_1')
  })

  it('is inert outside the account area', async () => {
    state.header = null
    expect(await getImpersonation()).toBeNull()
  })
})
