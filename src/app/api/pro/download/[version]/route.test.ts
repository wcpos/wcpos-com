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

const mockFetchReleaseAsset = vi.fn()
vi.mock('@/services/core/external/github-asset', () => ({
  fetchReleaseAsset: (...args: unknown[]) => mockFetchReleaseAsset(...args),
}))

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
    await expect(response.json()).resolves.toEqual({
      errorCode: 'missing_required_parameters',
    })
  })

  it('returns a stable error code when license validation fails', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 401,
      error: 'Invalid license key',
    })

    const response = await GET(
      new NextRequest(
        'http://localhost/api/pro/download/latest?key=BAD&instance=INST'
      ),
      { params: Promise.resolve({ version: 'latest' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'license_validation_failed',
    })
  })

  it('returns 403 for a suspended license even with a future expiry (ADR-0001)', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 200,
      data: {
        activated: false,
        status: 'inactive',
        productName: 'WCPOS Pro',
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
    await expect(response.json()).resolves.toEqual({
      errorCode: 'requested_version_not_available_for_license',
    })
  })

  it('streams the asset for an entitled version', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 200,
      data: {
        activated: true,
        status: 'active',
        productName: 'WCPOS Pro',
      },
      entitlement: { status: 'active', expiry: null },
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('3.2.0', '2026-01-15T00:00:00Z'),
    ])
    mockFetchReleaseAsset.mockResolvedValueOnce({
      stream: new Response('zip').body,
      filename: 'woocommerce-pos-pro-3.2.0.zip',
      contentType: 'application/zip',
    })

    const response = await GET(
      new NextRequest(
        'http://localhost/api/pro/download/latest?key=KEY&instance=INST'
      ),
      { params: Promise.resolve({ version: 'latest' }) }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-type')).toBe('application/zip')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="woocommerce-pos-pro-3.2.0.zip"'
    )
  })

  it('returns 502 when the asset cannot be fetched', async () => {
    mockValidateLicense.mockResolvedValueOnce({
      status: 200,
      data: {
        activated: true,
        status: 'active',
        productName: 'WCPOS Pro',
      },
      entitlement: { status: 'active', expiry: null },
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('3.2.0', '2026-01-15T00:00:00Z'),
    ])
    mockFetchReleaseAsset.mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/pro/download/latest?key=KEY&instance=INST'
      ),
      { params: Promise.resolve({ version: 'latest' }) }
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      errorCode: 'failed_fetch_release_asset',
    })
  })
})
