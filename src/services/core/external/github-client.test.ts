import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// cacheLife must run inside a Next.js 'use cache' scope; stub it for unit tests
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))

const { mockGetLatestRelease, mockGetReleaseByTag, mockListReleases, mockPaginate } =
  vi.hoisted(() => ({
    mockGetLatestRelease: vi.fn(),
    mockGetReleaseByTag: vi.fn(),
    mockListReleases: vi.fn(),
    mockPaginate: vi.fn(),
  }))

vi.mock('./github-auth', () => ({
  getOctokit: vi.fn(() => ({
    repos: {
      getLatestRelease: mockGetLatestRelease,
      getReleaseByTag: mockGetReleaseByTag,
      listReleases: mockListReleases,
    },
    paginate: mockPaginate,
  })),
}))

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }))

vi.mock('@/lib/logger', () => ({
  infraLogger: { error: mockLoggerError },
}))

import { getLatestRelease, getReleaseByTag, getReleases } from './github-client'

const rawRelease = {
  tag_name: 'v1.8.2',
  name: 'v1.8.2',
  body: 'Release notes',
  published_at: '2026-01-05T18:40:35Z',
  draft: false,
  prerelease: false,
  assets: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getLatestRelease', () => {
  it('transforms the GitHub response into GitHubReleaseInfo', async () => {
    mockGetLatestRelease.mockResolvedValue({ data: rawRelease })

    const release = await getLatestRelease('electron')

    expect(mockGetLatestRelease).toHaveBeenCalledWith({
      owner: 'wcpos',
      repo: 'electron',
    })
    expect(release).toEqual({
      tagName: 'v1.8.2',
      name: 'v1.8.2',
      body: 'Release notes',
      publishedAt: '2026-01-05T18:40:35Z',
      draft: false,
      prerelease: false,
      assets: [],
    })
  })

  it('returns null when the repository has no published release (404)', async () => {
    mockGetLatestRelease.mockRejectedValue(
      Object.assign(new Error('Not Found'), { status: 404 })
    )

    const release = await getLatestRelease('electron')

    expect(release).toBeNull()
    // A missing release is expected, not an error to be logged.
    expect(mockLoggerError).not.toHaveBeenCalled()
  })

  it('rethrows and logs when the request fails transiently', async () => {
    mockGetLatestRelease.mockRejectedValue(
      Object.assign(new Error('rate limited'), { status: 403 })
    )

    await expect(getLatestRelease('electron')).rejects.toThrow('rate limited')
    expect(mockLoggerError).toHaveBeenCalled()
  })

  it('rethrows non-HTTP failures (network errors) instead of reporting no release', async () => {
    mockGetLatestRelease.mockRejectedValue(new Error('network down'))

    await expect(getLatestRelease('electron')).rejects.toThrow('network down')
    expect(mockLoggerError).toHaveBeenCalled()
  })
})

describe('getReleaseByTag', () => {
  it('normalizes the tag with a v prefix', async () => {
    mockGetReleaseByTag.mockResolvedValue({ data: rawRelease })

    await getReleaseByTag('electron', '1.8.2')

    expect(mockGetReleaseByTag).toHaveBeenCalledWith({
      owner: 'wcpos',
      repo: 'electron',
      tag: 'v1.8.2',
    })
  })

  it('keeps an existing v prefix', async () => {
    mockGetReleaseByTag.mockResolvedValue({ data: rawRelease })

    await getReleaseByTag('electron', 'v1.8.2')

    expect(mockGetReleaseByTag).toHaveBeenCalledWith({
      owner: 'wcpos',
      repo: 'electron',
      tag: 'v1.8.2',
    })
  })

  it('returns null and logs when the request fails', async () => {
    mockGetReleaseByTag.mockRejectedValue(new Error('not found'))

    expect(await getReleaseByTag('electron', '0.0.0')).toBeNull()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})

describe('getReleases', () => {
  it('paginates and transforms all releases', async () => {
    mockPaginate.mockResolvedValue([
      rawRelease,
      { ...rawRelease, tag_name: 'v1.8.1', name: null },
    ])

    const releases = await getReleases('woocommerce-pos-pro')

    expect(mockPaginate).toHaveBeenCalledWith(mockListReleases, {
      owner: 'wcpos',
      repo: 'woocommerce-pos-pro',
      per_page: 100,
    })
    expect(releases).toHaveLength(2)
    expect(releases[0].tagName).toBe('v1.8.2')
    // name falls back to tag when missing
    expect(releases[1].name).toBe('v1.8.1')
  })

  it('returns an empty array and logs when the request fails', async () => {
    mockPaginate.mockRejectedValue(new Error('rate limited'))

    expect(await getReleases('woocommerce-pos-pro')).toEqual([])
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
