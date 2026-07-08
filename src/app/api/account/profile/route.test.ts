import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()
const mockUpsertBillingAddress = vi.fn()
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
  upsertDefaultBillingAddress: (...args: unknown[]) =>
    mockUpsertBillingAddress(...args),
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

  it('updates profile and returns customer with billing details', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
      addresses: [
        {
          id: 'caddr_1',
          address_1: '1 Example St',
          city: 'Perth',
          country_code: 'au',
          is_default_billing: true,
          metadata: { tax_number: 'abn-1' },
        },
      ],
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
    // No billing fields submitted → no address write.
    expect(mockUpsertBillingAddress).not.toHaveBeenCalled()
    expect(json.customer.email).toBe('user@example.com')
    expect(json.billingDetails).toEqual({
      countryCode: 'AU',
      addressLine1: '1 Example St',
      addressLine2: '',
      city: 'Perth',
      region: '',
      postalCode: '',
      taxNumber: 'abn-1',
    })
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

  it('writes billing details to the default billing address, not metadata', async () => {
    const currentCustomer = { id: 'cust_1', metadata: {}, addresses: [] }
    mockGetCustomer.mockResolvedValueOnce(currentCustomer)
    mockUpsertBillingAddress.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      addresses: [
        {
          id: 'caddr_1',
          address_1: '123 Main St',
          city: 'Austin',
          province: 'TX',
          postal_code: '78701',
          country_code: 'us',
          is_default_billing: true,
          metadata: { tax_number: '12-3456789' },
        },
      ],
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingAddress: {
            countryCode: 'US',
            addressLine1: '123 Main St',
            addressLine2: null,
            city: 'Austin',
            region: 'TX',
            postalCode: '78701',
            taxNumber: '12-3456789',
          },
        }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpsertBillingAddress).toHaveBeenCalledWith(currentCustomer, {
      country_code: 'us',
      address_1: '123 Main St',
      address_2: null,
      city: 'Austin',
      province: 'TX',
      postal_code: '78701',
      tax_number: '12-3456789',
    })
    // A billing-only PATCH has nothing customer-level to write.
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
    expect(json.billingDetails).toEqual({
      countryCode: 'US',
      addressLine1: '123 Main St',
      addressLine2: '',
      city: 'Austin',
      region: 'TX',
      postalCode: '78701',
      taxNumber: '12-3456789',
    })
  })

  it('accepts the legacy accountProfile payload from stale client bundles', async () => {
    const currentCustomer = { id: 'cust_1', metadata: {}, addresses: [] }
    mockGetCustomer.mockResolvedValueOnce(currentCustomer)
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      metadata: {},
      addresses: [],
    })
    mockUpsertBillingAddress.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'user@example.com',
      metadata: {},
      addresses: [
        {
          id: 'caddr_1',
          address_1: '1 Old Bundle Rd',
          country_code: 'au',
          is_default_billing: true,
        },
      ],
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountProfile: {
            avatarUrl: 'https://example.com/a.png',
            countryCode: 'AU',
            addressLine1: '1 Old Bundle Rd',
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    // Avatar half still lands in metadata…
    expect(mockUpdateCustomer.mock.calls[0][0].metadata).toMatchObject({
      account_profile: { avatarUrl: 'https://example.com/a.png' },
    })
    // …and the billing half lands on the address.
    expect(mockUpsertBillingAddress.mock.calls[0][1]).toMatchObject({
      country_code: 'au',
      address_1: '1 Old Bundle Rd',
    })
  })

  it('reports failure when the billing address write cannot be attempted', async () => {
    // A null upsert (no session token) is a failed write; a 200 here would
    // silently revert the user's billing edits with a success toast.
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1', addresses: [] })
    mockUpsertBillingAddress.mockResolvedValueOnce(null)

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingAddress: { countryCode: 'US', addressLine1: '1 Main St' },
        }),
      })
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ errorCode: 'unauthorized' })
  })

  it('merges avatar metadata via account_profile', async () => {
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
          avatar: {
            avatarDataUrl: 'data:image/png;base64,AAAA',
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
          avatarUrl: 'https://example.com/custom.png',
          secretField: 'do not leak',
        },
      },
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: {
            avatarUrl: 'https://example.com/custom.png',
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
        avatarUrl: 'https://example.com/custom.png',
      },
    })
  })
})
