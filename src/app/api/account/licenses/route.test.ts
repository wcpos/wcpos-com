import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetAllCustomerOrders = vi.fn()
const mockGetLicenseWithMachines = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getAllCustomerOrders: (...args: unknown[]) =>
    mockGetAllCustomerOrders(...args),
}))

vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    getLicenseWithMachines: (...args: unknown[]) =>
      mockGetLicenseWithMachines(...args),
  },
}))

import { GET } from './route'

describe('GET /api/account/licenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns licenses extracted from camelCase metadata IDs', async () => {
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
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ licenseId: 'lic_123' }],
        },
      },
    ])

    mockGetLicenseWithMachines.mockResolvedValueOnce({
      id: 'lic_123',
      key: 'ABCD-1234',
      status: 'active',
      expiry: null,
      maxMachines: 5,
      machines: [],
      metadata: {},
      policyId: 'policy_1',
      createdAt: '2025-01-01T00:00:00Z',
    })

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetLicenseWithMachines).toHaveBeenCalledWith('lic_123')
    expect(json.licenses).toHaveLength(1)
  })
})
