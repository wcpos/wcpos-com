import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockGetProPluginReleases = vi.fn()
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
  getProPluginReleases: (...args: unknown[]) =>
    mockGetProPluginReleases(...args),
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
  createRateLimiter: () => ({
    consume: (...args: unknown[]) => mockConsume(...args),
  }),
  clientIp: () => '1.2.3.4',
}))

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))

import { POST } from './route'

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

const ACTIVE_LICENCE = { status: 'active', expiry: null }
const EXPIRED_LICENCE = { status: 'expired', expiry: '2025-01-01T00:00:00Z' }

function tokenRequest(version: string) {
  return new NextRequest('http://localhost/api/account/downloads/token', {
    method: 'POST',
    body: JSON.stringify({ version }),
  })
}

describe('POST /api/account/downloads/token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.DOWNLOAD_TOKEN_SECRET = 'download-token-secret'
    mockEnv.KEYGEN_API_TOKEN = 'keygen-token-secret'
    mockConsume.mockResolvedValue({ success: true, remaining: 29 })
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(tokenRequest('1.9.0'))

    expect(response.status).toBe(401)
  })

  it('returns 500 and pages (fatal) when DOWNLOAD_TOKEN_SECRET is missing', async () => {
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockEnv.KEYGEN_API_TOKEN = undefined
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await POST(tokenRequest('1.9.0'))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Download token secret not configured')
    expect(mockDownloadFatal).toHaveBeenCalled()
    expect(mockConsume).not.toHaveBeenCalled()
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
  })

  it('returns 500 when DOWNLOAD_TOKEN_SECRET is missing even if KEYGEN_API_TOKEN is configured', async () => {
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await POST(tokenRequest('1.9.0'))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Download token secret not configured')
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
  })

  it('returns 429 and does not mint a token when rate limited', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockConsume.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await POST(tokenRequest('1.9.0'))

    expect(response.status).toBe(429)
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
    expect(mockGetProPluginReleases).not.toHaveBeenCalled()
    expect(mockDownloadWarn).toHaveBeenCalled()
  })

  it('returns a signed download URL for an entitled version and audits it', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-02-01T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [ACTIVE_LICENCE],
    })
    mockCreateDownloadToken.mockReturnValueOnce('signed-token')

    const response = await POST(tokenRequest('1.9.0'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.downloadUrl).toContain(
      '/api/account/download?token=signed-token'
    )
    // Token issuance is audited.
    expect(mockDownloadInfo).toHaveBeenCalled()
    expect(mockCreateDownloadToken).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust_1', version: '1.9.0' }),
      'download-token-secret'
    )
  })

  it('returns 404 and logs a warning when the release is missing', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-02-01T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [ACTIVE_LICENCE],
    })

    const response = await POST(tokenRequest('99.9.9'))

    expect(response.status).toBe(404)
    expect(mockDownloadWarn).toHaveBeenCalled()
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
  })

  it('returns 403 when the release is not entitled by any licence', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-02-01T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [EXPIRED_LICENCE],
    })

    const response = await POST(tokenRequest('1.9.0'))

    expect(response.status).toBe(403)
    expect(mockDownloadWarn).toHaveBeenCalled()
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
  })

  it('rate limits per customer id (not IP)', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_42' })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-02-01T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [ACTIVE_LICENCE],
    })
    mockCreateDownloadToken.mockReturnValueOnce('signed-token')

    await POST(tokenRequest('1.9.0'))

    expect(mockConsume).toHaveBeenCalledWith('cust_42')
  })
})
