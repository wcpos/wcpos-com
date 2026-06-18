import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

// cacheLife must run inside a Next.js 'use cache' scope; stub it for unit tests
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }))

vi.mock('@/lib/logger', () => ({
  infraLogger: { error: mockLoggerError },
}))

import {
  getProductVersions,
  selectVersion,
  versionFor,
  PRODUCT_LABELS,
  type ProductVersion,
} from './versions-client'

const sample: ProductVersion[] = [
  {
    label: PRODUCT_LABELS.free,
    version: '1.9.6',
    releaseDate: '2026-06-17T11:22:17Z',
    updateMethod: 'WordPress dashboard',
    link: 'https://wordpress.org/plugins/woocommerce-pos/',
    linkText: 'WordPress.org',
    note: null,
  },
  {
    label: PRODUCT_LABELS.ios,
    version: null,
    releaseDate: null,
    updateMethod: 'TestFlight',
    link: null,
    linkText: null,
    note: 'Beta',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('selectVersion / versionFor', () => {
  it('finds a product entry by label', () => {
    expect(selectVersion(sample, PRODUCT_LABELS.free)?.version).toBe('1.9.6')
  })

  it('returns null for an unknown label', () => {
    expect(selectVersion(sample, 'nope')).toBeNull()
    expect(versionFor(sample, 'nope')).toBeNull()
  })

  it('returns the version string for a known label', () => {
    expect(versionFor(sample, PRODUCT_LABELS.free)).toBe('1.9.6')
  })

  it('returns null when a known product has no version (beta)', () => {
    expect(versionFor(sample, PRODUCT_LABELS.ios)).toBeNull()
  })
})

describe('getProductVersions', () => {
  it('returns the feed data array on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 200, data: sample }),
      }),
    )

    const result = await getProductVersions()
    expect(result).toEqual(sample)
  })

  it('returns an empty array and logs when the feed fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    )

    expect(await getProductVersions()).toEqual([])
    expect(mockLoggerError).toHaveBeenCalled()
  })

  it('returns an empty array when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    expect(await getProductVersions()).toEqual([])
    expect(mockLoggerError).toHaveBeenCalled()
  })

  it('aborts the feed request after the timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
            })
          }),
      ),
    )

    const resultPromise = getProductVersions()
    await vi.advanceTimersByTimeAsync(5000)

    await expect(resultPromise).resolves.toEqual([])
    expect(mockLoggerError).toHaveBeenCalled()
  })

  it('tolerates a feed payload without a data array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 200 }) }),
    )

    expect(await getProductVersions()).toEqual([])
  })
})
