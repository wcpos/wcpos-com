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

function requestFor(version: string) {
  return GET(
    new NextRequest(
      `http://localhost/api/pro/update/${version}?key=KEY&instance=INST`
    ),
    { params: Promise.resolve({ version }) }
  )
}

describe('GET /api/pro/update/[version]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when key/instance are missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/pro/update/1.0.0'),
      { params: Promise.resolve({ version: '1.0.0' }) }
    )

    expect(response.status).toBe(400)
  })

  it('returns 403 for a suspended license even with a future expiry (ADR-0001)', async () => {
    // The plugin-display status is 'inactive' — entitlement must come from
    // the canonical field, or this suspended license would read as in-term.
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

    const response = await requestFor('1.0.0')

    expect(response.status).toBe(403)
  })

  it('serves the update for an EXPIRING license (canonical active)', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 200,
      data: {
        activated: true,
        status: 'active',
        expiresAt: '2026-06-14T00:00:00Z',
        activationsLimit: 3,
        activationsCount: 1,
        productName: 'WooCommerce POS Pro',
      },
      entitlement: { status: 'active', expiry: '2026-06-14T00:00:00Z' },
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('3.2.0', '2026-01-15T00:00:00Z'),
    ])

    const response = await requestFor('1.0.0')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasUpdate).toBe(true)
    expect(body.version).toBe('3.2.0')
  })

  it('fails closed to 403 when the entitlement field is missing', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 200,
      data: {
        activated: false,
        status: 'active',
        productName: 'WooCommerce POS Pro',
      },
      // no entitlement field
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('3.2.0', '2026-01-15T00:00:00Z'),
    ])

    const response = await requestFor('1.0.0')

    expect(response.status).toBe(403)
  })
})
