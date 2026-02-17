import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockFindReleaseByVersion = vi.fn()
const mockIsReleaseAllowedForLicenses = vi.fn()
const mockCreateDownloadToken = vi.fn()
const mockLicenseLoggerWarn = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) =>
    mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/services/core/business/pro-downloads', () => ({
  findReleaseByVersion: (...args: unknown[]) =>
    mockFindReleaseByVersion(...args),
  isReleaseAllowedForLicenses: (...args: unknown[]) =>
    mockIsReleaseAllowedForLicenses(...args),
}))

vi.mock('@/lib/download-token', () => ({
  createDownloadToken: (...args: unknown[]) => mockCreateDownloadToken(...args),
}))

vi.mock('@/lib/logger', () => ({
  licenseLogger: {
    warn: (...args: unknown[]) => mockLicenseLoggerWarn(...args),
    error: vi.fn(),
  },
}))

vi.mock('@/utils/env', () => ({
  env: {
    DOWNLOAD_TOKEN_SECRET: undefined,
    KEYGEN_API_TOKEN: undefined,
  },
}))

import { POST } from './route'

describe('POST /api/account/downloads/token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '1.9.0' }),
      })
    )

    expect(response.status).toBe(401)
  })

  it('returns a signed download URL for allowed versions', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAuthToken.mockResolvedValueOnce('auth-token-secret')
    mockFindReleaseByVersion.mockResolvedValueOnce({
      version: '1.9.0',
      assetName: 'woocommerce-pos-pro-1.9.0.zip',
    })
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [],
    })
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(true)
    mockCreateDownloadToken.mockReturnValueOnce('signed-token')

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '1.9.0' }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.downloadUrl).toContain('/api/account/download?token=signed-token')
    expect(mockCreateDownloadToken).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust_1',
        version: '1.9.0',
      }),
      'auth-token-secret'
    )
  })

  it('returns 404 and logs warning when release is missing', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAuthToken.mockResolvedValueOnce('auth-token-secret')
    mockFindReleaseByVersion.mockResolvedValueOnce(null)

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '99.9.9' }),
      })
    )

    expect(response.status).toBe(404)
    expect(mockLicenseLoggerWarn).toHaveBeenCalled()
  })

  it('returns 403 when release is not allowed by license', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAuthToken.mockResolvedValueOnce('auth-token-secret')
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
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(false)

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '1.9.0' }),
      })
    )

    expect(response.status).toBe(403)
  })
})
