import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetResolvedCustomerLicenses = vi.fn()
const mockVerifyDownloadToken = vi.fn()
const mockGetProPluginReleases = vi.fn()
const mockFetchReleaseAsset = vi.fn()
const mockDownloadInfo = vi.fn()
const mockDownloadWarn = vi.fn()
const mockDownloadError = vi.fn()
const mockDownloadFatal = vi.fn()

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
  getProPluginReleases: (...args: unknown[]) =>
    mockGetProPluginReleases(...args),
}))

vi.mock('@/services/core/external/github-asset', () => ({
  fetchReleaseAsset: (...args: unknown[]) => mockFetchReleaseAsset(...args),
}))

vi.mock('@/lib/logger', () => ({
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

function servedAsset() {
  return {
    stream: new Response('zip-binary').body,
    filename: 'woocommerce-pos-pro-1.9.0.zip',
    contentType: 'application/zip' as const,
  }
}

const ACTIVE_LICENCE = { status: 'active', expiry: null }

function downloadRequest() {
  return new NextRequest('http://localhost/api/account/download?token=test')
}

describe('GET /api/account/download', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockEnv.DOWNLOAD_TOKEN_SECRET = 'download-token-secret'
    mockEnv.KEYGEN_API_TOKEN = 'keygen-token-secret'
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await GET(downloadRequest())

    expect(response.status).toBe(401)
  })

  it('returns 500 and pages (fatal) when no signing secret is configured', async () => {
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockEnv.KEYGEN_API_TOKEN = undefined
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await GET(downloadRequest())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Download token secret not configured')
    expect(mockVerifyDownloadToken).not.toHaveBeenCalled()
    // Infra broken — fatal so Discord + email page on it.
    expect(mockDownloadFatal).toHaveBeenCalled()
  })

  it('returns 500 when DOWNLOAD_TOKEN_SECRET is missing even if KEYGEN_API_TOKEN is configured', async () => {
    mockEnv.DOWNLOAD_TOKEN_SECRET = undefined
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await GET(downloadRequest())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Download token secret not configured')
    expect(mockVerifyDownloadToken).not.toHaveBeenCalled()
    expect(mockDownloadFatal).toHaveBeenCalled()
  })

  it('returns 403 and audits a token whose customerId does not match', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'someone_else',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })

    const response = await GET(downloadRequest())

    expect(response.status).toBe(403)
    expect(mockDownloadWarn.mock.calls[0][0]).toEqual([
      'Download denied: invalid/mismatched token. customer=',
      ' ip=',
      '',
    ])
    expect(mockDownloadWarn.mock.calls[0].slice(1)).toEqual([
      'cust_1',
      'unknown',
    ])
    expect(mockGetProPluginReleases).not.toHaveBeenCalled()
  })

  it('returns 404 when the requested version does not exist', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '9.9.9',
      expiresAt: Date.now() + 60_000,
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-01-15T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [ACTIVE_LICENCE],
    })

    const response = await GET(downloadRequest())

    expect(response.status).toBe(404)
    expect(mockDownloadWarn.mock.calls[0][0]).toEqual([
      'Download denied: release not found. version=',
      ' customer=',
      ' ip=',
      '',
    ])
    expect(mockDownloadWarn.mock.calls[0].slice(1)).toEqual([
      '9.9.9',
      'cust_1',
      'unknown',
    ])
    expect(mockFetchReleaseAsset).not.toHaveBeenCalled()
  })

  it('returns 403 and audits when the release exists but is not entitled', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-01-15T00:00:00Z'),
    ])
    // Expired licence with a ceiling before the release date — not entitled.
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [{ status: 'expired', expiry: '2025-01-01T00:00:00Z' }],
    })

    const response = await GET(downloadRequest())

    expect(response.status).toBe(403)
    expect(mockDownloadWarn.mock.calls[0][0]).toEqual([
      'Download denied: not entitled. version=',
      ' customer=',
      ' ip=',
      '',
    ])
    expect(mockDownloadWarn.mock.calls[0].slice(1)).toEqual([
      '1.9.0',
      'cust_1',
      'unknown',
    ])
    expect(mockFetchReleaseAsset).not.toHaveBeenCalled()
  })

  it('streams and audits the release asset for an entitled signed token', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-01-15T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [ACTIVE_LICENCE],
    })
    mockFetchReleaseAsset.mockResolvedValueOnce(servedAsset())

    const response = await GET(downloadRequest())

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/zip')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    // Successful download is audited (who/what/when).
    expect(mockDownloadInfo).toHaveBeenCalled()
    expect(mockVerifyDownloadToken).toHaveBeenCalledWith(
      'test',
      'download-token-secret'
    )
  })

  it('returns 502 and pages (error) when the asset cannot be fetched', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockVerifyDownloadToken.mockReturnValueOnce({
      customerId: 'cust_1',
      version: '1.9.0',
      expiresAt: Date.now() + 60_000,
    })
    mockGetProPluginReleases.mockResolvedValueOnce([
      makeRelease('1.9.0', '2026-01-15T00:00:00Z'),
    ])
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({
      authenticated: true,
      licenses: [ACTIVE_LICENCE],
    })
    mockFetchReleaseAsset.mockResolvedValueOnce(null)

    const response = await GET(downloadRequest())

    expect(response.status).toBe(502)
    expect(mockDownloadError).toHaveBeenCalled()
  })
})
