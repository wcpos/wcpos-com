import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetLatestRelease = vi.fn()

vi.mock('@/services/core/external/github-client', () => ({
  githubClient: {
    getLatestRelease: (...args: unknown[]) => mockGetLatestRelease(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
  },
}))

import { GET } from './route'

describe('GET /api/desktop-releases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when no release is found', async () => {
    mockGetLatestRelease.mockResolvedValueOnce(null)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe('No release found')
    expect(mockGetLatestRelease).toHaveBeenCalledWith('electron')
  })

  it('returns the latest release with mapped assets', async () => {
    mockGetLatestRelease.mockResolvedValueOnce({
      tagName: 'v1.5.0',
      name: 'WooCommerce POS 1.5.0',
      assets: [
        {
          name: 'wcpos-1.5.0-arm64.dmg',
          browser_download_url: 'https://github.com/dl/wcpos-1.5.0-arm64.dmg',
          size: 12345,
          extra_field: 'should-not-leak',
        },
      ],
      publishedAt: '2026-06-01T00:00:00Z',
      body: 'Release notes',
    })

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      version: '1.5.0',
      name: 'WooCommerce POS 1.5.0',
      assets: [
        {
          name: 'wcpos-1.5.0-arm64.dmg',
          browser_download_url: 'https://github.com/dl/wcpos-1.5.0-arm64.dmg',
          size: 12345,
        },
      ],
      releaseDate: '2026-06-01T00:00:00Z',
      notes: 'Release notes',
    })
  })

  it('strips the leading v from the tag name only', async () => {
    mockGetLatestRelease.mockResolvedValueOnce({
      tagName: '2.0.0',
      name: 'No prefix',
      assets: [],
      publishedAt: '2026-06-01T00:00:00Z',
      body: '',
    })

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.version).toBe('2.0.0')
  })

  it('returns 500 when the GitHub client throws', async () => {
    mockGetLatestRelease.mockRejectedValueOnce(new Error('rate limited'))

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to fetch release information')
  })
})
