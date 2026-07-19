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
  getCheckoutGatewayHeaders: async () => ({}),
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

  it('parses providers, identity details, the emailpass identifier, and the flags', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        providers: ['emailpass', 'google'],
        provider_details: [
          {
            provider: 'google',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
            avatar: 'https://lh3.example/photo.jpg',
            handle: null,
          },
          // Malformed entries are dropped, never passed through.
          { email: 'no-provider@example.com' },
          'garbage',
        ],
        emailpass_identifier: 'Ada@Example.com',
        emailpass_pending: true,
        emailpass_updated_at: '2026-03-14T09:00:00.000Z',
        emailpass_reserved: false,
      }),
    })

    await expect(getCustomerAuthMethods()).resolves.toEqual({
      providers: ['emailpass', 'google'],
      providerDetails: [
        {
          provider: 'google',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          avatar: 'https://lh3.example/photo.jpg',
          handle: null,
        },
      ],
      emailpassIdentifier: 'Ada@Example.com',
      emailpassPending: true,
      emailpassUpdatedAt: '2026-03-14T09:00:00.000Z',
      emailpassReserved: false,
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://medusa.test/store/customers/me/auth-methods',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('defaults the new fields when the backend predates them', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        providers: ['google'],
        emailpass_identifier: null,
        emailpass_pending: false,
      }),
    })

    await expect(getCustomerAuthMethods()).resolves.toEqual({
      providers: ['google'],
      providerDetails: [],
      emailpassIdentifier: null,
      emailpassPending: false,
      emailpassUpdatedAt: null,
      emailpassReserved: false,
    })
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
