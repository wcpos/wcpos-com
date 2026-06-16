import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockFindReleaseByVersion = vi.fn()
const mockIsReleaseAllowedForLicenses = vi.fn()
const mockCreateDownloadToken = vi.fn()
const mockDownloadInfo = vi.fn()
const mockDownloadWarn = vi.fn()
const mockDownloadError = vi.fn()
const mockDownloadFatal = vi.fn()
const mockConsume = vi.fn()

const mockEnv = vi.hoisted(() => ({
  DOWNLOAD_TOKEN_SECRET: undefined as string | undefined,
  KEYGEN_API_TOKEN: 'keygen-token-secret' as string | undefined,
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) =>
    mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/services/core/business/pro-downloads', () => ({
  findReleaseByVersion: (...args: unknown[]) =>
    mockFindReleaseByVersion(...args),
}))

vi.mock('@/lib/license', () => ({
  isReleaseAllowedForLicenses: (...args: unknown[]) =>
    mockIsReleaseAllowedForLicenses(...args),
}))

vi.mock('@/lib/download-token', () => ({
  createDownloadToken: (...args: unknown[]) => mockCreateDownloadToken(...args),
}))

vi.mock('@/lib/logger', () => ({
  licenseLogger: { warn: vi.fn(), error: vi.fn() },
  downloadLogger: {
    info: (...args: unknown[]) => mockDownloadInfo(...args),
    warn: (...args: unknown[]) => mockDownloadWarn(...args),
    error: (...args: unknown[]) => mockDownloadError(...args),
    fatal: (...args: unknown[]) => mockDownloadFatal(...args),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: (...args: unknown[]) => mockConsume(...args) }),
  clientIp: () => '1.2.3.4',
}))

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

import { POST } from './route'

describe('POST /api/account/downloads/token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockEnv.KEYGEN_API_TOKEN = 'keygen-token-secret'
    mockConsume.mockResolvedValue({ success: true, remaining: 29 })
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

  it('returns 500 when no signing secret is configured', async () => {
    mockEnv.KEYGEN_API_TOKEN = undefined
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '1.9.0' }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Download token secret not configured')
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
  })

  it('returns a signed download URL for allowed versions', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
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
    // Token issuance is audited.
    expect(mockDownloadInfo).toHaveBeenCalled()
    expect(mockCreateDownloadToken).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust_1',
        version: '1.9.0',
      }),
      'keygen-token-secret'
    )
  })

  it('prefers DOWNLOAD_TOKEN_SECRET over KEYGEN_API_TOKEN', async () => {
    mockEnv.DOWNLOAD_TOKEN_SECRET = 'download-token-secret'
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
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

    expect(response.status).toBe(200)
    expect(mockCreateDownloadToken).toHaveBeenCalledWith(
      expect.anything(),
      'download-token-secret'
    )
  })

  it('returns 404 and logs warning when release is missing', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockFindReleaseByVersion.mockResolvedValueOnce(null)

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '99.9.9' }),
      })
    )

    expect(response.status).toBe(404)
    expect(mockDownloadWarn).toHaveBeenCalled()
  })

  it('returns 403 when release is not allowed by license', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
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
    expect(mockDownloadWarn).toHaveBeenCalled()
  })

  it('returns 429 and does not mint a token when rate limited', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockConsume.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '1.9.0' }),
      })
    )

    expect(response.status).toBe(429)
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
    expect(mockFindReleaseByVersion).not.toHaveBeenCalled()
    expect(mockDownloadWarn).toHaveBeenCalled()
  })

  it('rate limits per customer id (not IP)', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_42' })
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

    await POST(
      new NextRequest('http://localhost/api/account/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ version: '1.9.0' }),
      })
    )

    expect(mockConsume).toHaveBeenCalledWith('cust_42')
  })
})
