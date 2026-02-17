import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCustomer = vi.fn()
const mockGetAllCustomerOrders = vi.fn()
const mockGetLicenseWithMachines = vi.fn()
const mockValidateLicenseKey = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAllCustomerOrders: (...args: unknown[]) => mockGetAllCustomerOrders(...args),
}))

vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    getLicenseWithMachines: (...args: unknown[]) =>
      mockGetLicenseWithMachines(...args),
    validateLicenseKey: (...args: unknown[]) =>
      mockValidateLicenseKey(...args),
  },
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
    mockGetAllCustomerOrders.mockResolvedValueOnce([
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
        status: 'ACTIVE',
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
  })
})
