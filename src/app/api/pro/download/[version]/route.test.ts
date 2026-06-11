import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockValidateLicense = vi.fn()
vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    validateLicense: (...args: unknown[]) => mockValidateLicense(...args),
  },
}))

// Mock release fetching only — entitlement (isReleaseAllowedForLicenses)
// stays real so these tests pin the actual policy, not a mock of it.
const mockGetProPluginReleases = vi.fn()
vi.mock('@/services/core/business/pro-downloads', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/services/core/business/pro-downloads')
    >()
  return {
    ...actual,
    getProPluginReleases: (...args: unknown[]) =>
      mockGetProPluginReleases(...args),
  }
})

import { GET } from './route'

function makeRelease(version: string, publishedAt: string) {
  return {
    version,
    tagName: `v${version}`,
    name: `WCPOS Pro ${version}`,
    releaseNotes: '',
    publishedAt,
    assetName: `woocommerce-pos-pro-${version}.zip`,
    assetApiUrl: `https://api.github.com/assets/${version}`,
    assetUrl: `https://downloads.example.com/${version}.zip`,
  }
}

describe('GET /api/pro/download/[version]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when key/instance are missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/pro/download/latest'),
      { params: Promise.resolve({ version: 'latest' }) }
    )

    expect(response.status).toBe(400)
  })

  it('returns 403 for a suspended license even with a future expiry (ADR-0001)', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 200,
      data: {
        activated: false,
        status: 'inactive',
        productName: 'WooCommerce POS Pro',
      },
      entitlement: { status: 'suspended', expiry: '2099-01-01T00:00:00Z' },
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('3.2.0', '2026-01-15T00:00:00Z'),
    ])

    const response = await GET(
      new NextRequest(
        'http://localhost/api/pro/download/latest?key=KEY&instance=INST'
      ),
      { params: Promise.resolve({ version: 'latest' }) }
    )

    expect(response.status).toBe(403)
  })
})
