import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { infoMock, errorMock, warnMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  warnMock: vi.fn(),
}))

vi.mock('@/utils/env', () => ({
  env: { OPENCLAW_GATEWAY_URL: 'https://gw.test', OPENCLAW_TOKEN: 'tok' },
}))
vi.mock('@/lib/logger', () => ({
  apiLogger: { info: infoMock, error: errorMock, warn: warnMock },
}))
vi.mock('@/lib/support/rate-limit', () => ({
  consumeFeedbackRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 19 }),
}))

import { POST } from './route'
import { consumeFeedbackRateLimit } from '@/lib/support/rate-limit'

const ANSWER_ID = '0b9c2f4e-3d1a-4c5b-9e8f-7a6b5c4d3e2f'
const SESSION_ID = '5f1e2d3c-4b5a-4968-8776-655443322110'
const valid = { answerId: ANSWER_ID, sessionId: SESSION_ID, vote: 'up' }

function req(body: unknown) {
  return new Request('http://localhost/api/support/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deskReplies(status: number) {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('POST /api/support/feedback', () => {
  it.each([
    ['a bad answerId', { ...valid, answerId: 'not-a-uuid' }],
    ['a bad sessionId', { ...valid, sessionId: 's1' }],
    ['a bad vote', { ...valid, vote: 'meh' }],
    ['a missing vote', { answerId: ANSWER_ID, sessionId: SESSION_ID }],
    ['an extra free-text field', { ...valid, comment: 'this was wrong' }],
    ['an unknown locale', { ...valid, locale: 'xx' }],
  ])('400 on %s, without calling the desk', async (_, body) => {
    const fetchMock = deskReplies(200)
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('429 when the per-IP limit is spent, without calling the desk', async () => {
    const fetchMock = deskReplies(200)
    vi.mocked(consumeFeedbackRateLimit).mockResolvedValueOnce({ success: false, remaining: 0 })
    const res = await POST(req(valid))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ ok: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards exactly answer_id, session_id, vote and locale with the bearer token', async () => {
    const fetchMock = deskReplies(200)
    await POST(req({ ...valid, vote: 'down', locale: 'fr' }))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gw.test/support/feedback')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({
      answer_id: ANSWER_ID,
      session_id: SESSION_ID,
      vote: 'down',
      locale: 'fr',
    })
  })

  it.each([200, 404, 409])('maps desk %i to 200 { ok: true }', async (status) => {
    deskReplies(status)
    const res = await POST(req(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it.each([401, 429, 500, 502])('maps desk %i to 503 { ok: false }', async (status) => {
    deskReplies(status)
    const res = await POST(req(valid))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ ok: false })
    expect(warnMock).toHaveBeenCalledTimes(1)
  })

  it('maps a network error to 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const res = await POST(req(valid))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ ok: false })
  })

  it('aborts after 10 s and maps the timeout to 503', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
            )
          })
      )
    )
    let settled = false
    const pending = POST(req(valid)).finally(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(9_999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const res = await pending
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ ok: false })
    expect(warnMock).toHaveBeenCalledTimes(1)
  })
})
