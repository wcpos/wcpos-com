import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockVerifyDownloadToken = vi.fn()
const mockFindReleaseByVersion = vi.fn()
const mockIsReleaseAllowedForLicenses = vi.fn()
const mockFetchReleaseAsset = vi.fn()
const mockLicenseLoggerError = vi.fn()
const mockLicenseLoggerWarn = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) =>
    mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/lib/download-token', () => ({
  verifyDownloadToken: (...args: unknown[]) => mockVerifyDownloadToken(...args),
}))

vi.mock('@/services/core/business/pro-downloads', () => ({
  findReleaseByVersion: (...args: unknown[]) =>
    mockFindReleaseByVersion(...args),
}))

vi.mock('@/lib/license', () => ({
  isReleaseAllowedForLicenses: (...args: unknown[]) =>
    mockIsReleaseAllowedForLicenses(...args),
}))

vi.mock('@/services/core/external/github-asset', () => ({
  fetchReleaseAsset: (...args: unknown[]) => mockFetchReleaseAsset(...args),
}))

vi.mock('@/lib/logger', () => ({
  licenseLogger: {
    error: (...args: unknown[]) => mockLicenseLoggerError(...args),
    warn: (...args: unknown[]) => mockLicenseLoggerWarn(...args),
  },
}))

const mockEnv = vi.hoisted(() => ({
  DOWNLOAD_TOKEN_SECRET: undefined as string | undefined,
  KEYGEN_API_TOKEN: 'keygen-token-secret' as string | undefined,
}))

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

import { GET } from './route'

function servedAsset() {
  return {
    stream: new Response('zip-binary').body,
    filename: 'woocommerce-pos-pro-1.9.0.zip',
    contentType: 'application/zip' as const,
  }
}

describe('GET /api/account/download', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockEnv.KEYGEN_API_TOKEN = 'keygen-token-secret'
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(401)
  })

  it('returns 500 when no signing secret is configured', async () => {
    mockEnv.KEYGEN_API_TOKEN = undefined
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(500)
    expect(mockVerifyDownloadToken).not.toHaveBeenCalled()
    expect(mockLicenseLoggerError).toHaveBeenCalled()
  })

  it('streams the release asset for a valid signed token', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockFindReleaseByVersion.mockResolvedValueOnce({
      version: '1.9.0',
      assetName: 'woocommerce-pos-pro-1.9.0.zip',
      assetApiUrl: 'https://api.github.com/assets/123',
      assetUrl: 'https://github.com/download.zip',
    })
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [],
    })
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(true)
    mockFetchReleaseAsset.mockResolvedValueOnce(servedAsset())

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/zip')
    expect(response.headers.get('content-disposition')).toContain(
      'woocommerce-pos-pro-1.9.0.zip'
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('returns 403 when the release is not allowed for the customer', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockFindReleaseByVersion.mockResolvedValueOnce({ version: '1.9.0' })
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [],
    })
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(false)

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(403)
    expect(mockFetchReleaseAsset).not.toHaveBeenCalled()
  })

  it('returns 502 when the asset cannot be fetched', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockFindReleaseByVersion.mockResolvedValueOnce({
      version: '1.9.0',
      assetName: 'z.zip',
      assetApiUrl: 'x',
      assetUrl: 'y',
    })
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [],
    })
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(true)
    mockFetchReleaseAsset.mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(502)
    expect(mockLicenseLoggerError).toHaveBeenCalled()
  })
})
