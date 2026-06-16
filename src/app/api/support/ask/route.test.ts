import { describe, it, expect, vi, beforeEach } from 'vitest'

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
import { consumeRateLimit } from '@/lib/support/rate-limit'
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
  })

  it('403 when Turnstile fails', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(false)
    const res = await POST(req({ question: 'hi', turnstileToken: 'bad' }))
    expect(res.status).toBe(403)
  })

  it('429 when rate limited', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(consumeRateLimit).mockResolvedValueOnce({ success: false, remaining: 0 })
    const res = await POST(req({ question: 'hi', turnstileToken: 't' }))
    expect(res.status).toBe(429)
  })

  it('200 with the answer on success', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockResolvedValue({ answer: 'Do X.', model: 'claude' })
    const res = await POST(req({ question: 'How?', turnstileToken: 't', sessionId: 's1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ answer: 'Do X.', sessionId: 's1' })
  })

  it('maps an OpenclawError to a friendly 503', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(true)
    vi.mocked(askAide).mockRejectedValue(new OpenclawError('boom', 502, 'runtime_error'))
    const res = await POST(req({ question: 'How?', turnstileToken: 't' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toHaveProperty('error')
  })
})
