import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDownloadUrl = vi.fn()

vi.mock('@/services/core/business/electron-service', () => ({
  electronService: {
    getDownloadUrl: (...args: unknown[]) => mockGetDownloadUrl(...args),
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

function makeArgs(platform = 'darwin-arm64', query = '') {
  return [
    new Request(
      `http://localhost:3000/api/electron/download/${platform}${query}`
    ),
    { params: Promise.resolve({ platform }) },
  ] as const
}

describe('GET /api/electron/download/[platform]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to the latest version when none is specified', async () => {
    mockGetDownloadUrl.mockResolvedValueOnce({
      status: 404,
      error: 'No release found',
      errorCode: 'release_not_found',
    })

    await GET(...makeArgs('darwin-arm64'))

    expect(mockGetDownloadUrl).toHaveBeenCalledWith('darwin-arm64', 'latest')
  })

  it('passes the requested version from the query string', async () => {
    mockGetDownloadUrl.mockResolvedValueOnce({
      status: 404,
      error: 'No release found',
      errorCode: 'release_not_found',
    })

    await GET(...makeArgs('win32-x64', '?version=1.4.0'))

    expect(mockGetDownloadUrl).toHaveBeenCalledWith('win32-x64', '1.4.0')
  })

  it('returns the error status when the service reports an error', async () => {
    mockGetDownloadUrl.mockResolvedValueOnce({
      status: 404,
      error: 'No release found',
      errorCode: 'release_not_found',
    })

    const response = await GET(...makeArgs())
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      status: 404,
      error: 'No release found',
      errorCode: 'release_not_found',
    })
  })

  it('redirects to the GitHub download URL with 302', async () => {
    mockGetDownloadUrl.mockResolvedValueOnce(
      'https://github.com/wcpos/electron/releases/download/v1.5.0/wcpos-1.5.0-arm64.dmg'
    )

    const response = await GET(...makeArgs())

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://github.com/wcpos/electron/releases/download/v1.5.0/wcpos-1.5.0-arm64.dmg'
    )
  })

  it('returns 500 when the service throws', async () => {
    mockGetDownloadUrl.mockRejectedValueOnce(new Error('github down'))

    const response = await GET(...makeArgs())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      status: 500,
      error: 'Internal server error',
      errorCode: 'internal_server_error',
    })
  })
})
