import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockVerifyDownloadToken = vi.fn()
const mockFindReleaseByVersion = vi.fn()
const mockIsReleaseAllowedForLicenses = vi.fn()
const mockGetGitHubToken = vi.fn()
const mockLicenseLoggerError = vi.fn()
const mockLicenseLoggerWarn = vi.fn()
const mockDownloadInfo = vi.fn()
const mockDownloadWarn = vi.fn()
const mockDownloadError = vi.fn()
const mockDownloadFatal = vi.fn()

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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
  findReleaseByVersion: (...args: unknown[]) => mockFindReleaseByVersion(...args),
}))

vi.mock('@/lib/license', () => ({
  isReleaseAllowedForLicenses: (...args: unknown[]) =>
    mockIsReleaseAllowedForLicenses(...args),
}))

vi.mock('@/services/core/external/github-auth', () => ({
  getGitHubToken: (...args: unknown[]) => mockGetGitHubToken(...args),
}))

vi.mock('@/lib/logger', () => ({
  licenseLogger: {
    error: (...args: unknown[]) => mockLicenseLoggerError(...args),
    warn: (...args: unknown[]) => mockLicenseLoggerWarn(...args),
  },
  downloadLogger: {
    info: (...args: unknown[]) => mockDownloadInfo(...args),
    warn: (...args: unknown[]) => mockDownloadWarn(...args),
    error: (...args: unknown[]) => mockDownloadError(...args),
    fatal: (...args: unknown[]) => mockDownloadFatal(...args),
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

describe('GET /api/account/download', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockEnv.KEYGEN_API_TOKEN = 'keygen-token-secret'
    mockGetGitHubToken.mockResolvedValue(null)
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
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Download token secret not configured')
    expect(mockVerifyDownloadToken).not.toHaveBeenCalled()
    // Infra broken — fatal so Discord + email page on it.
    expect(mockDownloadFatal).toHaveBeenCalled()
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
    // Successful download is audited (who/what/when).
    expect(mockDownloadInfo).toHaveBeenCalled()
    expect(mockVerifyDownloadToken).toHaveBeenCalledWith(
      'test',
      'keygen-token-secret'
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/assets/123', {
      headers: {
        Accept: 'application/octet-stream',
      },
    })
  })

  it('falls back to browser asset URL when API asset URL fails', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetGitHubToken.mockResolvedValueOnce('github-token')
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
    mockFetch
      .mockResolvedValueOnce(new Response('not-found', { status: 404 }))
      .mockResolvedValueOnce(new Response('zip-binary', { status: 200 }))

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.github.com/assets/123')
    expect(mockFetch.mock.calls[1][0]).toBe('https://github.com/download.zip')
  })

  it('logs and returns 502 when all asset download attempts fail', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetGitHubToken.mockResolvedValueOnce('github-token')
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
    mockFetch
      .mockResolvedValueOnce(new Response('nope', { status: 404 }))
      .mockResolvedValueOnce(new Response('still-no', { status: 403 }))

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.error).toBe('Failed to fetch release asset')
    // Delivery broken for an entitled customer — error so Discord pages (the
    // download category bypasses the rate limit).
    expect(mockDownloadError).toHaveBeenCalled()
  })

  it('denies and audits a token whose customerId does not match', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'someone_else',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(403)
    expect(mockDownloadWarn).toHaveBeenCalled()
    expect(mockFindReleaseByVersion).not.toHaveBeenCalled()
  })

  it('denies and audits a download the license does not entitle', async () => {
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
    mockIsReleaseAllowedForLicenses.mockReturnValueOnce(false)

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(403)
    expect(mockDownloadWarn).toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
