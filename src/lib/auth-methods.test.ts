import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthToken, getImpersonation } = vi.hoisted(() => ({
  getAuthToken: vi.fn(async () => 'jwt-token'),
  getImpersonation: vi.fn(async () => null),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/medusa-auth', () => ({ getAuthToken }))
vi.mock('@/lib/impersonation', () => ({ getImpersonation }))
vi.mock('@/lib/store-environment', () => ({
  getMedusaBackendUrl: async () => 'https://medusa.test',
  getMedusaPublishableKey: async () => 'pk_test',
}))

import { getCustomerAuthMethods } from './auth-methods'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('getCustomerAuthMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthToken.mockResolvedValue('jwt-token')
    getImpersonation.mockResolvedValue(null)
  })

  it('parses providers, the emailpass identifier, and the pending flag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        providers: ['emailpass', 'google'],
        emailpass_identifier: 'Ada@Example.com',
        emailpass_pending: true,
      }),
    })

    await expect(getCustomerAuthMethods()).resolves.toEqual({
      providers: ['emailpass', 'google'],
      emailpassIdentifier: 'Ada@Example.com',
      emailpassPending: true,
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://medusa.test/store/customers/me/auth-methods',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns null while impersonating — the bearer token is the ADMIN, not the target', async () => {
    getImpersonation.mockResolvedValue({ customerId: 'cus_target' } as never)

    await expect(getCustomerAuthMethods()).resolves.toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns null when signed out, on 404 (old backend), and on fetch failure', async () => {
    getAuthToken.mockResolvedValueOnce(null as never)
    await expect(getCustomerAuthMethods()).resolves.toBeNull()

    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
    await expect(getCustomerAuthMethods()).resolves.toBeNull()

    mockFetch.mockRejectedValueOnce(new Error('network'))
    await expect(getCustomerAuthMethods()).resolves.toBeNull()
  })
})
