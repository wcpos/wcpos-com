import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetGitHubToken = vi.fn()
const mockInfraWarn = vi.fn()
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('./github-auth', () => ({
  getGitHubToken: (...args: unknown[]) => mockGetGitHubToken(...args),
}))

vi.mock('@/lib/logger', () => ({
  infraLogger: { warn: (...args: unknown[]) => mockInfraWarn(...args) },
}))

import { fetchReleaseAsset } from './github-asset'

const release = {
  assetApiUrl: 'https://api.github.com/assets/123',
  assetUrl: 'https://github.com/download.zip',
  assetName: 'woocommerce-pos-pro-1.9.0.zip',
}

describe('fetchReleaseAsset', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetGitHubToken.mockResolvedValue('github-token')
  })

  it('returns the asset stream from the API url on first success', async () => {
    mockFetch.mockResolvedValueOnce(new Response('zip-binary', { status: 200 }))

    const served = await fetchReleaseAsset(release)

    expect(served?.filename).toBe('woocommerce-pos-pro-1.9.0.zip')
    expect(served?.contentType).toBe('application/zip')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/assets/123', {
      headers: {
        Authorization: 'Bearer github-token',
        Accept: 'application/octet-stream',
      },
    })
  })

  it('falls back to the browser url when the API url fails', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('nope', { status: 404 }))
      .mockResolvedValueOnce(new Response('zip-binary', { status: 200 }))

    const served = await fetchReleaseAsset(release)

    expect(served).not.toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.github.com/assets/123')
    expect(mockFetch.mock.calls[1][0]).toBe('https://github.com/download.zip')
  })

  it('returns null when both attempts fail', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('nope', { status: 404 }))
      .mockResolvedValueOnce(new Response('still-no', { status: 403 }))

    const served = await fetchReleaseAsset(release)

    expect(served).toBeNull()
    expect(mockInfraWarn).toHaveBeenCalled()
  })

  it('omits the Authorization header when no token is configured', async () => {
    mockGetGitHubToken.mockResolvedValue(null)
    mockFetch.mockResolvedValueOnce(new Response('zip', { status: 200 }))

    await fetchReleaseAsset(release)

    expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/assets/123', {
      headers: { Accept: 'application/octet-stream' },
    })
  })
})
