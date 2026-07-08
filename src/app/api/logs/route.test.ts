import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockEnv = vi.hoisted(() => ({
  LOKI_URL: undefined as string | undefined,
  LOKI_API_KEY: undefined as string | undefined,
}))
const { errorMock } = vi.hoisted(() => ({ errorMock: vi.fn() }))

vi.mock('@/utils/env', () => ({
  env: mockEnv,
}))
vi.mock('@/lib/logger', () => ({
  infraLogger: { error: errorMock },
}))

// Uses the real @/lib/sinks/loki-format helpers (pure functions).
import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('https://wcpos.com/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const validEntry: [string, string] = [
  '1717977600000000000',
  '{"level":"info","message":"hello"}',
]

describe('POST /api/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.LOKI_URL = undefined
    mockEnv.LOKI_API_KEY = undefined
  })

  it('rejects a non-array body with 400', async () => {
    const response = await POST(makeRequest({ message: 'not an array' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ errorCode: 'invalid_log_format' })
  })

  it('rejects an empty array with 400', async () => {
    const response = await POST(makeRequest([]))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ errorCode: 'invalid_log_format' })
  })

  it.each([
    ['non-tuple entry', ['just a string']],
    ['wrong tuple length', [['1717977600000000000']]],
    ['non-string message', [['1717977600000000000', 42]]],
    ['non-numeric timestamp', [['not-a-number', 'message']]],
  ])('rejects %s with 400', async (_label, logs) => {
    const response = await POST(makeRequest(logs))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ errorCode: 'invalid_log_entry_format' })
  })

  it('succeeds without forwarding when Loki is not configured', async () => {
    const response = await POST(makeRequest([validEntry]))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('forwards valid logs to the Loki push endpoint', async () => {
    mockEnv.LOKI_URL = 'https://loki.example.com'
    mockFetch.mockResolvedValueOnce({ ok: true })

    const response = await POST(makeRequest([validEntry]))

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [endpoint, init] = mockFetch.mock.calls[0]
    expect(endpoint).toBe('https://loki.example.com/loki/api/v1/push')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['X-API-Key']).toBeUndefined()

    const payload = JSON.parse(init.body)
    expect(payload.streams).toHaveLength(1)
    expect(payload.streams[0].stream).toMatchObject({
      job: 'wcpos-com',
      service: 'wcpos-com',
      source: 'browser',
    })
    expect(payload.streams[0].values).toEqual([validEntry])
  })

  it('sends the X-API-Key header when LOKI_API_KEY is configured', async () => {
    mockEnv.LOKI_URL = 'https://loki.example.com'
    mockEnv.LOKI_API_KEY = 'secret-key'
    mockFetch.mockResolvedValueOnce({ ok: true })

    await POST(makeRequest([validEntry]))

    const [, init] = mockFetch.mock.calls[0]
    expect(init.headers['X-API-Key']).toBe('secret-key')
  })

  it('still returns success when Loki responds with an error, logging it once', async () => {
    mockEnv.LOKI_URL = 'https://loki.example.com'
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502 })

    const response = await POST(makeRequest([validEntry]))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
    // One error-level record per failed request (via the server sinks, never
    // back through this route) — never one per forwarded entry.
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('still returns success when the Loki push throws, logging it once', async () => {
    mockEnv.LOKI_URL = 'https://loki.example.com'
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const response = await POST(makeRequest([validEntry]))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed JSON with 400 without logging an error', async () => {
    // Client-caused garbage is validated like any other bad payload; the
    // fire-and-forget browser sender ignores the status, and it must not
    // page via error level.
    const response = await POST(makeRequest('{not json'))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({ errorCode: 'invalid_log_format' })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})
