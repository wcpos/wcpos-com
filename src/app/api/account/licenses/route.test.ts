import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetResolvedCustomerLicenses = vi.fn()

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) =>
    mockGetResolvedCustomerLicenses(...args),
}))

import { GET } from './route'

describe('GET /api/account/licenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: false,
      licenses: [],
    })

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns resolved customer licenses', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [
        {
          id: 'lic_123',
          key: 'WCPOS-AAAA-1111',
          status: 'active',
          expiry: null,
          maxMachines: 1,
          machines: [],
          metadata: {},
          policyId: 'policy_1',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.licenses).toHaveLength(1)
    expect(json.licenses[0].key).toBe('WCPOS-AAAA-1111')
  })
})
