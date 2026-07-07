import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()
const { errorMock, assertViewOnly } = vi.hoisted(() => ({
  errorMock: vi.fn(),
  assertViewOnly: vi.fn(),
}))

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly,
  ViewOnlyError: class ViewOnlyError extends Error {},
}))
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: errorMock },
}))

import { PATCH } from './route'

describe('PATCH /api/account/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 read_only_inspection while impersonating', async () => {
    const { ViewOnlyError } = await import('@/lib/impersonation')
    assertViewOnly.mockRejectedValueOnce(new ViewOnlyError())

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'read_only_inspection' })
    expect(mockGetCustomer).not.toHaveBeenCalled()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Test' }),
      })
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ errorCode: 'unauthorized' })
  })

  it('updates profile and returns customer', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+15551234567',
        }),
      })
    )

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
    })
    expect(json.customer.email).toBe('user@example.com')
  })

  it('never forwards email to Medusa, even when the client sends it', async () => {
    // Regression: Medusa's store update-customer schema rejects unknown
    // fields, so a forwarded `email` failed EVERY profile save with
    // 400 "Unrecognized fields: 'email'".
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      first_name: 'Updated',
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'changed@example.com',
          first_name: 'Updated',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockUpdateCustomer).toHaveBeenCalledTimes(1)
    expect(mockUpdateCustomer.mock.calls[0][0]).not.toHaveProperty('email')
  })

  it('logs at error and returns 400 when the update fails', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockUpdateCustomer.mockRejectedValueOnce(
      new Error('Failed to update customer')
    )

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Updated' }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ errorCode: 'update_failed' })
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('merges account profile metadata for avatar and tax details', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      metadata: {
        oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
        marketing_opt_in: true,
      },
    })
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      metadata: {},
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountProfile: {
            avatarDataUrl: 'data:image/png;base64,AAAA',
            countryCode: 'US',
            addressLine1: '123 Main St',
            city: 'Austin',
            region: 'TX',
            postalCode: '78701',
            taxNumber: '12-3456789',
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockUpdateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
          marketing_opt_in: true,
          account_profile: {
            avatarDataUrl: 'data:image/png;base64,AAAA',
            countryCode: 'US',
            addressLine1: '123 Main St',
            city: 'Austin',
            region: 'TX',
            postalCode: '78701',
            taxNumber: '12-3456789',
          },
        },
      })
    )
  })
  it('returns only client-safe profile metadata after update', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      metadata: {
        oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
        discord_user_id: 'secret-discord-id',
      },
    })
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      metadata: {
        oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
        discord_user_id: 'secret-discord-id',
        marketing_opt_in: true,
        account_profile: {
          countryCode: 'US',
          secretField: 'do not leak',
        },
      },
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountProfile: {
            countryCode: 'US',
          },
        }),
      })
    )

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.customer.metadata).toEqual({
      oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
      account_profile: {
        avatarDataUrl: '',
        avatarUrl: '',
        countryCode: 'US',
        addressLine1: '',
        addressLine2: '',
        city: '',
        region: '',
        postalCode: '',
        taxNumber: '',
      },
    })
  })

})
