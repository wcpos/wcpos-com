import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/utils/env', () => ({
  env: {
    OPENCLAW_GATEWAY_URL: 'https://gw.test',
    OPENCLAW_TOKEN: 'tok',
    OPENCLAW_SUPPORT_INTENT: 'aide.web.support_question',
  },
}))

import { askAide, OpenclawError } from './client'

describe('askAide', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('posts to /execute as aide and returns the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: 'Here is how.', model: 'claude' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await askAide({ question: 'How do I print?', sessionId: 's1' })

    expect(result).toEqual({ answer: 'Here is how.', model: 'claude' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gw.test/execute')
    expect(init.headers.Authorization).toBe('Bearer tok')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      agent_id: 'aide',
      task_intent: 'aide.web.support_question',
      prompt: 'How do I print?',
      session_id: 's1',
    })
  })

  it('throws a typed OpenclawError on a non-200 with the gateway code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'task_intent_denied', message: 'no' } }), { status: 403 })
    ))
    await expect(askAide({ question: 'x' })).rejects.toMatchObject({
      name: 'OpenclawError', status: 403, code: 'task_intent_denied',
    })
  })

  it('maps an aborted/failed fetch to a gateway_unreachable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    await expect(askAide({ question: 'x' })).rejects.toMatchObject({ code: 'timeout' })
  })
})
