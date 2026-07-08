import { describe, it, expect, vi, beforeEach } from 'vitest'

const { errorMock, warnMock } = vi.hoisted(() => ({ errorMock: vi.fn(), warnMock: vi.fn() }))

vi.mock('@/lib/logger', () => ({
  apiLogger: { error: errorMock, warn: warnMock },
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
  })

  it('lets verifyTurnstile decide when the token is empty', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Do X.', model: 'sonnet', answered: true, sources: [] })
    const res = await POST(req({ question: 'How?', turnstileToken: '' }))
    expect(res.status).toBe(200)
    expect(verifyTurnstile).toHaveBeenCalledWith('', 'unknown')
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
  })

  it('200 with the answer on success', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Do X.', model: 'sonnet', answered: true, sources: [] })
    const res = await POST(req({ question: 'How?', turnstileToken: 't', sessionId: 's1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      answer: 'Do X.',
      sessionId: 's1',
      answered: true,
      sources: [],
    })
  })

  it('passes the requested locale to Aide', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Faites X.', model: 'sonnet', answered: true, sources: [] })
    const res = await POST(req({ question: 'Comment ?', turnstileToken: 't', sessionId: 's1', locale: 'fr' }))

    expect(res.status).toBe(200)
    expect(askAide).toHaveBeenCalledWith(expect.objectContaining({
      question: 'Comment ?',
      sessionId: 's1',
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

  it('maps an OpenclawError to a friendly 503 and logs at error', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('boom', 502, 'runtime_error'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ errorCode: 'unavailable' })
    // Gateway failures go through the logging seam (not console.error) so
    // they reach Loki/Discord like every other route failure.
    expect(errorMock).toHaveBeenCalledTimes(1)
  })
})
