import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mutable env so each test can control Loki configuration
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    LOKI_URL: undefined as string | undefined,
    LOKI_API_KEY: undefined as string | undefined,
  },
}))
vi.mock('@/utils/env', () => ({ env: mockEnv }))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import after mocks are set up
import { buildLogQuery, queryLogs } from './logs-service'

function lokiSuccess(result: unknown[] = []) {
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      data: { resultType: 'streams', result },
    }),
  }
}

describe('logs-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.LOKI_URL = undefined
    mockEnv.LOKI_API_KEY = undefined
  })

  describe('buildLogQuery', () => {
    it('selects the wcpos-com service stream', () => {
      expect(buildLogQuery()).toBe('{service="wcpos-com"}')
    })

    it('adds a json level filter when a level is given', () => {
      expect(buildLogQuery('error')).toBe(
        '{service="wcpos-com"} | json | level = "error"'
      )
    })
  })

  describe('queryLogs', () => {
    it('returns unconfigured when LOKI_URL is unset', async () => {
      const result = await queryLogs()

      expect(result).toEqual({ status: 'unconfigured' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('queries query_range with selector, range, limit and direction', async () => {
      mockEnv.LOKI_URL = 'https://loki.example.com/'
      mockEnv.LOKI_API_KEY = 'secret-key'
      mockFetch.mockResolvedValueOnce(lokiSuccess())

      const before = Date.now()
      const result = await queryLogs({ level: 'error', rangeMinutes: 60 })
      const after = Date.now()

      expect(result.status).toBe('ok')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [calledUrl, init] = mockFetch.mock.calls[0]
      const url = new URL(calledUrl as string)

      expect(url.origin).toBe('https://loki.example.com')
      expect(url.pathname).toBe('/loki/api/v1/query_range')
      expect(url.searchParams.get('query')).toBe(
        '{service="wcpos-com"} | json | level = "error"'
      )
      expect(url.searchParams.get('direction')).toBe('backward')
      expect(url.searchParams.get('limit')).toBe('100')

      // Timestamps are nanoseconds spanning the last hour
      const start = Number(url.searchParams.get('start'))
      const end = Number(url.searchParams.get('end'))
      expect(end).toBeGreaterThanOrEqual(before * 1_000_000)
      expect(end).toBeLessThanOrEqual(after * 1_000_000)
      expect(end - start).toBe(60 * 60 * 1000 * 1_000_000)

      // Reuses the push path's API key header
      expect(
        (init as { headers: Record<string, string> }).headers['X-API-Key']
      ).toBe('secret-key')
    })

    it('omits the X-API-Key header when no key is configured', async () => {
      mockEnv.LOKI_URL = 'https://loki.example.com'
      mockFetch.mockResolvedValueOnce(lokiSuccess())

      await queryLogs()

      const [, init] = mockFetch.mock.calls[0]
      expect(
        (init as { headers: Record<string, string> }).headers
      ).not.toHaveProperty('X-API-Key')
    })

    it('maps Loki streams into ApiLog entries, newest first', async () => {
      mockEnv.LOKI_URL = 'https://loki.example.com'

      const olderTs = '1700000000000000000'
      const newerTs = '1700000060000000000'

      mockFetch.mockResolvedValueOnce(
        lokiSuccess([
          {
            stream: { service: 'wcpos-com', environment: 'production' },
            values: [
              [
                olderTs,
                JSON.stringify({
                  level: 'error',
                  category: 'wcpos.auth',
                  message: 'Login failed',
                  properties: { code: 401 },
                }),
              ],
            ],
          },
          {
            stream: {
              service: 'wcpos-com',
              environment: 'production',
              source: 'browser',
            },
            values: [[newerTs, 'not-json garbage line']],
          },
        ])
      )

      const result = await queryLogs()

      expect(result.status).toBe('ok')
      if (result.status !== 'ok') return

      expect(result.logs).toHaveLength(2)

      // Newest first
      expect(result.logs[0].createdAt.getTime()).toBe(
        Number(newerTs) / 1_000_000
      )
      // Non-JSON lines fall back to the raw line and unknown level
      expect(result.logs[0]).toMatchObject({
        level: 'unknown',
        category: null,
        message: 'not-json garbage line',
        source: 'browser',
        environment: 'production',
        properties: null,
      })

      expect(result.logs[1]).toMatchObject({
        level: 'error',
        category: 'wcpos.auth',
        message: 'Login failed',
        source: 'server',
        environment: 'production',
        properties: { code: 401 },
      })
      expect(result.level).toBe(null)
      expect(result.rangeMinutes).toBe(60)
    })

    it('returns an error result on non-200 responses', async () => {
      mockEnv.LOKI_URL = 'https://loki.example.com'
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })

      const result = await queryLogs()

      expect(result).toEqual({
        status: 'error',
        message: 'Loki query failed (403)',
      })
    })

    it('returns an error result when fetch throws', async () => {
      mockEnv.LOKI_URL = 'https://loki.example.com'
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await queryLogs()

      expect(result).toEqual({ status: 'error', message: 'ECONNREFUSED' })
    })

    it('returns an error result on unexpected response bodies', async () => {
      mockEnv.LOKI_URL = 'https://loki.example.com'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'weird' }),
      })

      const result = await queryLogs()

      expect(result).toEqual({
        status: 'error',
        message: 'Loki returned an unexpected response',
      })
    })
  })
})
