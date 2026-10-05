import { describe, it, expect, vi, beforeEach } from 'vitest'

const { infoMock, errorMock, warnMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  warnMock: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: { info: infoMock, error: errorMock, warn: warnMock },
}))
vi.mock('@/lib/support/turnstile', () => ({ verifyTurnstile: vi.fn() }))
vi.mock('@/lib/support/rate-limit', () => ({
  consumeRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 7 }),
  consumeDailyBudget: vi.fn().mockResolvedValue({ success: true, used: 1 }),
}))
vi.mock('@/lib/openclaw/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/openclaw/client')>('@/lib/openclaw/client')
  return { ...actual, askAide: vi.fn() }
})

import { POST } from './route'
import { verifyTurnstile } from '@/lib/support/turnstile'
import { consumeDailyBudget, consumeRateLimit } from '@/lib/support/rate-limit'
import { askAide, OpenclawError } from '@/lib/openclaw/client'

const SESSION_ID = '3f2b8c4e-9d1a-4b6f-8e2c-7a5d0c1b9e34'

function req(body: unknown) {
  return new Request('http://localhost/api/support/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/support/ask', () => {
  it('400 on an empty question', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    const res = await POST(req({ question: '', turnstileToken: 't' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ errorCode: 'invalid_question' })
  })

  it('403 when Turnstile fails', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(false)
    const res = await POST(req({ question: 'hi', turnstileToken: 'bad' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ errorCode: 'bot_check_failed' })
    // Logged with the token-presence fingerprint (empty token = broken
    // widget or site key, the 2026-07-08 outage signature) at info.
    expect(infoMock).toHaveBeenCalledWith(expect.anything(), true, null)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('lets verifyTurnstile decide when the token is empty', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Do X.', model: 'sonnet', answered: true, sources: [] })
    const res = await POST(req({ question: 'How?', turnstileToken: '' }))
    expect(res.status).toBe(200)
    expect(verifyTurnstile).toHaveBeenCalledWith('', null, 'unknown')
  })

  it('429 when rate limited', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(consumeRateLimit).mockResolvedValueOnce({ success: false, remaining: 0 })
    const res = await POST(req({ question: 'hi', turnstileToken: 't' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ errorCode: 'rate_limited' })
  })

  it('429 when the daily support budget is exhausted', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(consumeDailyBudget).mockResolvedValueOnce({ success: false, used: 501 })
    const res = await POST(req({ question: 'hi', turnstileToken: 't' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ errorCode: 'budget_exhausted' })
    // Support is off for the rest of the day — warn, but not alert-level.
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('200 with the answer on success', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Do X.', model: 'sonnet', answered: true, sources: [] })
    const res = await POST(req({ question: 'How?', turnstileToken: 't', sessionId: SESSION_ID }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      answer: 'Do X.',
      sessionId: SESSION_ID,
      answered: true,
      sources: [],
    })
  })

  it('returns the desk answerId, and leaves it out when there is none', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide)
      .mockResolvedValueOnce({ answer: 'Do X.', answered: true, sources: [], answerId: '3f2b8c1e-5d4a-4e6f-9b7c-2a1d0e9f8c7b' })
      .mockResolvedValueOnce({ answer: 'Do Y.', answered: true, sources: [] })
    const first = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(await first.json()).toMatchObject({ answerId: '3f2b8c1e-5d4a-4e6f-9b7c-2a1d0e9f8c7b' })
    const second = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(await second.json()).not.toHaveProperty('answerId')
  })

  it('passes the requested locale to Aide', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Faites X.', model: 'sonnet', answered: true, sources: [] })
    const res = await POST(req({ question: 'Comment ?', turnstileToken: 't', sessionId: SESSION_ID, locale: 'fr' }))

    expect(res.status).toBe(200)
    expect(askAide).toHaveBeenCalledWith(expect.objectContaining({
      question: 'Comment ?',
      sessionId: SESSION_ID,
      locale: 'fr',
    }))
  })

  it('502 and an error log when the gateway sends an empty answer', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: '', model: 'sonnet', answered: false, sources: [] })
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ errorCode: 'empty_answer' })
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('passes a gateway 429 through with its message, logged at warn not error', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(
      new OpenclawError('The assistant is busy right now — please try again later.', 429, 'rate_limited')
    )
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ errorCode: 'gateway_rate_limited' })
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('maps a runtime OpenclawError to a friendly 502 and logs at error', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('boom', 502, 'runtime_error'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ errorCode: 'unavailable' })
    // Gateway failures go through the logging seam (not console.error) so
    // they reach Loki/Discord like every other route failure.
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('passes busy 429 through as gateway_busy, logged at warn not error', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('busy', 429, 'busy'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ errorCode: 'gateway_busy' })
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(warnMock).toHaveBeenCalledWith(expect.anything(), 429, 'busy', 'unknown')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('maps a desk question_too_long 400 to invalid_question', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('too long', 400, 'question_too_long'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ errorCode: 'invalid_question' })
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('maps payload_too_large 413 to invalid_question 400', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('too large', 413, 'payload_too_large'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ errorCode: 'invalid_question' })
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('maps timeout to 504 and logs at error', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('timed out', 503, 'timeout'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(504)
    expect(await res.json()).toEqual({ errorCode: 'timeout' })
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('maps unauthorized 401 to unavailable 503 and logs at error', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('unauthorized', 401, 'unauthorized'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ errorCode: 'unavailable' })
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(errorMock).toHaveBeenCalledWith(expect.anything(), 401, 'unauthorized', 'unknown', expect.any(OpenclawError))
  })

  it('maps gateway_unreachable to unavailable 503', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('unreachable', 503, 'gateway_unreachable'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ errorCode: 'unavailable' })
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('maps an unexpected error to unavailable 502 with unknown status and code', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new Error('x'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ errorCode: 'unavailable' })
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(errorMock).toHaveBeenCalledWith(expect.anything(), 'unknown', 'unknown', 'unknown', expect.any(Error))
  })

  it('replaces a malformed sessionId with a fresh UUID', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Do X.', answered: true, sources: [] })
    const res = await POST(req({ question: 'How?', turnstileToken: 't', sessionId: 'not-a-uuid' }))
    expect(res.status).toBe(200)
    expect(askAide).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }))
    expect(vi.mocked(askAide).mock.calls[0][0].sessionId).not.toBe('not-a-uuid')
  })
})
