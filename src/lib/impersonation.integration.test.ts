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
  // The bearer token always belongs to the REAL session — the admin — even
  // when getCustomer() resolves the impersonated target.
  getAuthToken: async () => 'admin-jwt',
}))
vi.mock('@/lib/store-environment', () => ({
  getMedusaBackendUrl: async () => 'https://medusa.test',
  getMedusaPublishableKey: async () => 'pk_test',
}))
vi.mock('@/lib/discord/medusa-admin', () => ({
  getAdminCustomerById: async (id: string) => ({ id, email: 'target@x.com' }),
  listAdminCustomerOrders: async () => [
    { id: 'ord_1', display_id: 1, metadata: { license_key: 'KEY-1' } },
  ],
}))

import { getImpersonation } from './impersonation'
import { getAllOrders } from './customer-orders'
import { getCustomerAuthMethods } from './auth-methods'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  state.header = '1'
  state.cookie = 'cus_target'
  mockFetch.mockReset()
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

/**
 * The profile page renders the Connections card from getCustomer() (the
 * impersonated TARGET) but getCustomerAuthMethods() authenticates as the REAL
 * session — the admin. Without the short-circuit the admin's password/OAuth
 * rows render on the target's profile, so support staff read the wrong
 * connection state for the account they are inspecting.
 *
 * These wire the real getImpersonation into the real getCustomerAuthMethods:
 * they fail if the guard is dropped, and — unlike a test that mocks
 * getImpersonation — they also fail if /account scoping stops resolving, which
 * would silently turn the guard into a no-op.
 */
describe('auth methods under impersonation (lib layer)', () => {
  it('never fetches auth methods while inspecting a target', async () => {
    await expect(getCustomerAuthMethods()).resolves.toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches auth methods for a customer viewing their own profile', async () => {
    state.cookie = null // no impersonation cookie → an ordinary account request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ providers: ['emailpass'], emailpass_identifier: 'a@x.com' }),
    })

    await expect(getCustomerAuthMethods()).resolves.toEqual({
      providers: ['emailpass'],
      emailpassIdentifier: 'a@x.com',
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
