import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCustomer = vi.fn()
const mockGetAllOrders = vi.fn()
const mockListAdminCustomerOrders = vi.fn()
const mockGetLicenseWithMachines = vi.fn()
const mockValidateLicenseKey = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/lib/customer-orders', () => ({
  getAllOrders: (...args: unknown[]) => mockGetAllOrders(...args),
}))

vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    getLicenseWithMachines: (...args: unknown[]) =>
      mockGetLicenseWithMachines(...args),
    validateLicenseKey: (...args: unknown[]) =>
      mockValidateLicenseKey(...args),
  },
}))

vi.mock('@/lib/discord/medusa-admin', () => ({
  listAdminCustomerOrders: (...args: unknown[]) =>
    mockListAdminCustomerOrders(...args),
}))

import { getResolvedCustomerLicenses } from './customer-licenses'

describe('getResolvedCustomerLicenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthenticated when customer is missing', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const result = await getResolvedCustomerLicenses()
    expect(result.authenticated).toBe(false)
    expect(result.licenses).toEqual([])
  })

  it('resolves licenses from key-only metadata', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_1',
        status: 'completed',
        display_id: 1,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ license_key: 'WCPOS-AAAA-1111' }],
        },
      },
    ])
    mockValidateLicenseKey.mockResolvedValueOnce({
      valid: true,
      code: 'VALID',
      detail: 'ok',
      license: {
        id: 'lic_1',
        key: 'WCPOS-AAAA-1111',
        status: 'active',
        expiry: null,
        maxMachines: 1,
        metadata: {},
        policyId: 'policy_1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    })

    const result = await getResolvedCustomerLicenses()

    expect(result.authenticated).toBe(true)
    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].key).toBe('WCPOS-AAAA-1111')
    // EXPIRING is a paid, in-term Keygen status and must surface as active.
    expect(result.licenses[0].status).toBe('active')
  })

  it('normalizes raw Keygen statuses on the id-resolution path', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_1',
        status: 'completed',
        display_id: 1,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ license_id: 'lic_2', license_key: 'WCPOS-BBBB-2222' }],
        },
      },
    ])
    mockGetLicenseWithMachines.mockResolvedValueOnce({
      id: 'lic_2',
      key: 'WCPOS-BBBB-2222',
      status: 'EXPIRING',
      expiry: '2026-06-03T00:00:00Z',
      maxMachines: 1,
      machines: [],
      metadata: {},
      policyId: 'policy_1',
      createdAt: '2026-01-01T00:00:00Z',
    })

    const result = await getResolvedCustomerLicenses()

    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].status).toBe('active')
  })

  it('resolves licenses from the supplied customer orders', async () => {
    mockListAdminCustomerOrders.mockResolvedValueOnce([
      {
        id: 'order_2',
        status: 'completed',
        display_id: 2,
        email: 'other@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ license_key: 'WCPOS-BBBB-2222' }],
        },
      },
    ])
    mockValidateLicenseKey.mockResolvedValueOnce({
      valid: true,
      code: 'VALID',
      detail: 'ok',
      license: {
        id: 'lic_2',
        key: 'WCPOS-BBBB-2222',
        status: 'ACTIVE',
        expiry: null,
        maxMachines: 1,
        metadata: {},
        policyId: 'policy_1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    })

    const result = await getResolvedCustomerLicenses({
      id: 'cust_2',
      email: 'other@example.com',
      has_account: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    expect(mockGetCustomer).not.toHaveBeenCalled()
    expect(mockGetAllOrders).not.toHaveBeenCalled()
    expect(mockListAdminCustomerOrders).toHaveBeenCalledWith('cust_2')
    expect(result.authenticated).toBe(true)
    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].key).toBe('WCPOS-BBBB-2222')
  })
})
