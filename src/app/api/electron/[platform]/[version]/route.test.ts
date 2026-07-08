import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetLatestUpdate = vi.fn()

vi.mock('@/services/core/business/electron-service', () => ({
  electronService: {
    getLatestUpdate: (...args: unknown[]) => mockGetLatestUpdate(...args),
  },
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
  },
}))

import { GET } from './route'

function makeArgs(platform = 'darwin-arm64', version = '1.5.0') {
  return [
    new Request(`http://localhost:3000/api/electron/${platform}/${version}`),
    { params: Promise.resolve({ platform, version }) },
  ] as const
}

describe('GET /api/electron/[platform]/[version]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes platform and version to the electron service', async () => {
    mockGetLatestUpdate.mockResolvedValueOnce({
      status: 404,
      errorCode: 'release_not_found',
    })

    await GET(...makeArgs('win32-x64', '1.3.0'))

    expect(mockGetLatestUpdate).toHaveBeenCalledWith('win32-x64', '1.3.0')
  })

  it('returns the error status when the service reports an error', async () => {
    mockGetLatestUpdate.mockResolvedValueOnce({
      status: 404,
      errorCode: 'release_not_found',
    })

    const response = await GET(...makeArgs())
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({ status: 404, errorCode: 'release_not_found' })
  })

  it('returns 200 with the modern response shape (>= 1.4.0)', async () => {
    const update = {
      status: 200,
      version: '1.6.0',
      assets: [
        {
          name: 'wcpos-1.6.0-arm64.dmg',
          browser_download_url: 'https://github.com/dl/wcpos-1.6.0-arm64.dmg',
          size: 100,
        },
      ],
      releaseDate: '2026-06-01T00:00:00Z',
    }
    mockGetLatestUpdate.mockResolvedValueOnce(update)

    const response = await GET(...makeArgs('darwin-arm64', '1.5.0'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual(update)
  })

  it('returns 200 with the legacy flat shape (< 1.4.0)', async () => {
    const legacy = {
      version: '1.6.0',
      assets: [],
      releaseDate: '2026-06-01T00:00:00Z',
    }
    mockGetLatestUpdate.mockResolvedValueOnce(legacy)

    const response = await GET(...makeArgs('darwin-arm64', '1.3.0'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual(legacy)
  })

  it('returns 500 when the service throws', async () => {
    mockGetLatestUpdate.mockRejectedValueOnce(new Error('github down'))

    const response = await GET(...makeArgs())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({ status: 500, errorCode: 'internal_server_error' })
  })
})
