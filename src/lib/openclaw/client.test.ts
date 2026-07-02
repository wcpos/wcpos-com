import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/utils/env', () => ({
  env: {
    OPENCLAW_GATEWAY_URL: 'https://gw.test',
    OPENCLAW_TOKEN: 'tok',
  },
}))

import { askAide } from './client'

describe('askAide', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('posts to /support/answer and returns the grounded answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answered: true,
          answer: 'Here is how.',
          sources: ['support/receipt-printing.md'],
          confidence: 0.9,
          model: 'sonnet',
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await askAide({ question: 'How do I print?', sessionId: 's1' })

    expect(result).toEqual({
      answer: 'Here is how.',
      model: 'sonnet',
      answered: true,
      sources: ['support/receipt-printing.md'],
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gw.test/support/answer')
    expect(init.headers.Authorization).toBe('Bearer tok')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      question: 'How do I print?',
      session_id: 's1',
      channel: 'web',
    })
  })

  it('returns the hand-off message when the answerer escalates (still HTTP 200)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answered: false,
          answer: 'Please ask in our Discord.',
          sources: [],
          confidence: 0,
          needs_escalation: true,
          escalation_reason: 'no_matching_docs',
          model: 'sonnet',
        }),
        { status: 200 }
      )
    ))

    const result = await askAide({ question: 'Something obscure' })

    expect(result.answered).toBe(false)
    expect(result.answer).toBe('Please ask in our Discord.')
    expect(result.sources).toEqual([])
  })

  it('throws a typed OpenclawError on a non-200 with the gateway code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'no' } }), { status: 429 })
    ))
    await expect(askAide({ question: 'x' })).rejects.toMatchObject({
      name: 'OpenclawError', status: 429, code: 'rate_limited',
    })
  })

  it('maps an aborted/failed fetch to a gateway_unreachable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    await expect(askAide({ question: 'x' })).rejects.toMatchObject({ code: 'timeout' })
  })
})
