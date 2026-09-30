import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/utils/env', () => ({
  env: {
    OPENCLAW_GATEWAY_URL: 'https://gw.test',
    OPENCLAW_TOKEN: 'tok',
  },
}))

import { askAide, sendFeedback } from './client'

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

  it('includes the requested locale in the gateway payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answered: true,
          answer: 'Voici comment.',
          sources: [],
          confidence: 0.9,
          model: 'sonnet',
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await askAide({ question: 'Comment imprimer ?', sessionId: 's1', locale: 'fr' })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toMatchObject({
      question: 'Comment imprimer ?',
      session_id: 's1',
      channel: 'web',
      locale: 'fr',
    })
  })

  it('returns the desk answer_id as answerId, and omits it when the desk sends none', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ answered: true, answer: 'A.', sources: [], answer_id: '3f2b8c1e-5d4a-4e6f-9b7c-2a1d0e9f8c7b' }),
        { status: 200 }
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ answered: true, answer: 'B.', sources: [] }),
        { status: 200 }
      )))

    expect((await askAide({ question: 'x' })).answerId).toBe('3f2b8c1e-5d4a-4e6f-9b7c-2a1d0e9f8c7b')
    expect(await askAide({ question: 'y' })).not.toHaveProperty('answerId')
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

describe('sendFeedback', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the desk status and cancels the unread response body', async () => {
    const cancel = vi.fn()
    // A body that never closes, like a desk that stalls after sending headers.
    const body = new ReadableStream({ pull: () => new Promise(() => {}), cancel })
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)

    const status = await sendFeedback({
      answerId: '3f2b8c1e-5d4a-4e6f-9b7c-2a1d0e9f8c7b',
      sessionId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      vote: 'up',
    })

    expect(status).toBe(409)
    expect(cancel).toHaveBeenCalledOnce()
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gw.test/support/feedback')
  })
})
