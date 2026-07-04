import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, OPTIONS } from './route'

function keygenJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function call(query: string) {
  return GET(new NextRequest(`https://wcpos.com/api/legacy/wc-am?${query}`))
}

const ACTIVE = { status: 200, data: { valid: true, activated: true, status: 'active' } }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WC API Manager compatibility shim', () => {
  it('activates by forwarding to the Keygen server and returns the WC AM envelope', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))

    const res = await call('wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, activated: true })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://updates.wcpos.com/pro/license/activate')
    expect(init).toMatchObject({ method: 'POST' })
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ key: 'KEY', instance: 'site-1' })
  })

  it('reports a failed activation as success:false with the server message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      keygenJson(
        { status: 404, error: 'Not Found', message: 'A customer account does not exist for this API Key.' },
        404,
      ),
    )

    const res = await call('wc-api=am-software-api&request=activation&api_key=BAD&instance=site-1')

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: false,
      activated: false,
      error: 'A customer account does not exist for this API Key.',
      code: 404,
    })
  })

  it('treats a 404 machine-not-found deactivation as a successful deactivation', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      keygenJson({ status: 404, error: 'Machine not found', message: 'This instance is not activated.' }, 404),
    )

    const res = await call('wc-api=am-software-api&request=deactivation&api_key=KEY&instance=site-1')

    expect(await res.json()).toEqual({ success: true, activated: false })
  })

  it('reports non-machine 404 deactivation failures as success:false', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      keygenJson(
        { status: 404, error: 'Not Found', message: 'A customer account does not exist for this API Key.' },
        404,
      ),
    )

    const res = await call('wc-api=am-software-api&request=deactivation&api_key=BAD&instance=site-1')

    expect(await res.json()).toMatchObject({
      success: false,
      activated: false,
      error: 'A customer account does not exist for this API Key.',
      code: 404,
    })
  })

  it('maps a status check to success + activation state', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))

    const res = await call('wc-api=am-software-api&request=status&api_key=KEY&instance=site-1')

    expect(await res.json()).toEqual({ success: true, activated: true })
  })

  it('rejects requests missing the key or instance without calling the server', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))

    const res = await call('wc-api=am-software-api&request=activation&instance=site-1')

    expect(await res.json()).toMatchObject({ success: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('degrades gracefully when the license server is unreachable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

    const res = await call('wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1')

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: false })
  })

  it('maps an aborted upstream request to the temporary-unavailable response', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new DOMException('Timed out', 'AbortError'))

    const res = await call('wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: false,
      error: 'The license server is temporarily unavailable. Please try again shortly.',
    })
  })

  it('answers CORS preflight', async () => {
    const res = await OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
