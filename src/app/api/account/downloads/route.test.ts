import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetResolvedCustomerLicenses = vi.fn()
const mockGetProPluginReleases = vi.fn()
const mockIsReleaseAllowedForLicenses = vi.fn()

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) =>
    mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/services/core/business/pro-downloads', () => ({
  getProPluginReleases: (...args: unknown[]) =>
    mockGetProPluginReleases(...args),
  isReleaseAllowedForLicenses: (...args: unknown[]) =>
    mockIsReleaseAllowedForLicenses(...args),
}))

import { GET } from './route'

describe('GET /api/account/downloads', () => {
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

  it('returns releases with allowed flags', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [
        {
          id: 'lic_1',
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
    mockGetProPluginReleases.mockResolvedValueOnce([
      {
        version: '1.9.0',
        tagName: 'v1.9.0',
        name: 'WCPOS Pro 1.9.0',
        publishedAt: '2026-02-01T00:00:00Z',
        assetName: 'woocommerce-pos-pro-1.9.0.zip',
        assetUrl: 'https://example.com/file.zip',
      },
    ])
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(true)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.releases).toHaveLength(1)
    expect(json.releases[0].allowed).toBe(true)
  })
})
