import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockVerifyDownloadToken = vi.fn()
const mockFindReleaseByVersion = vi.fn()
const mockIsReleaseAllowedForLicenses = vi.fn()
const mockGetGitHubToken = vi.fn()

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) =>
    mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/lib/download-token', () => ({
  verifyDownloadToken: (...args: unknown[]) => mockVerifyDownloadToken(...args),
}))

vi.mock('@/services/core/business/pro-downloads', () => ({
  findReleaseByVersion: (...args: unknown[]) => mockFindReleaseByVersion(...args),
  isReleaseAllowedForLicenses: (...args: unknown[]) =>
    mockIsReleaseAllowedForLicenses(...args),
}))

vi.mock('@/services/core/external/github-auth', () => ({
  getGitHubToken: (...args: unknown[]) => mockGetGitHubToken(...args),
}))

vi.mock('@/utils/env', () => ({
  env: {
    DOWNLOAD_TOKEN_SECRET: undefined,
    KEYGEN_API_TOKEN: undefined,
  },
}))

import { GET } from './route'

describe('GET /api/account/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGitHubToken.mockResolvedValue(null)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(401)
  })

  it('allows downloads with auth-token fallback secret', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAuthToken.mockResolvedValueOnce('auth-token-secret')
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockFindReleaseByVersion.mockResolvedValueOnce({
      version: '1.9.0',
      assetName: 'woocommerce-pos-pro-1.9.0.zip',
      assetUrl: 'https://github.com/download.zip',
    })
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [],
    })
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce(
      new Response('zip-binary', {
        status: 200,
      })
    )

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/zip')
  })
})
