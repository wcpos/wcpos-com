import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const trackAttributedServerEvent = vi.fn()
vi.mock('@/services/core/analytics/posthog-service', () => ({
  trackAttributedServerEvent: (...args: unknown[]) =>
    trackAttributedServerEvent(...args),
}))

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
  trackAttributedServerEvent.mockClear()
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
      error: 'license_request_failed',
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
      error: 'license_request_failed',
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

    expect(await res.json()).toEqual({
      success: false,
      error: 'missing_required_parameters',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('degrades gracefully when the license server is unreachable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

    const res = await call('wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: false,
      error: 'license_server_unavailable',
    })
  })

  it('maps an aborted upstream request to the temporary-unavailable response', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new DOMException('Timed out', 'AbortError'))

    const res = await call('wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: false,
      error: 'license_server_unavailable',
    })
  })

  it('answers CORS preflight', async () => {
    const res = await OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  describe('landing-page attribution', () => {
    it('captures a successful activation keyed to the forwarded anon_id', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))

      const res = await call(
        'wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1&anon_id=anon-123&site_uuid=uuid-abc',
      )

      // Attribution must never change the response contract.
      expect(await res.json()).toEqual({ success: true, activated: true })
      expect(trackAttributedServerEvent).toHaveBeenCalledTimes(1)
      expect(trackAttributedServerEvent).toHaveBeenCalledWith('license_activated', 'anon-123', {
        site_uuid: 'uuid-abc',
        instance: 'site-1',
        source: 'wc-am-shim',
      })
    })

    it('does not capture when the plugin omits the anon_id', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))

      await call('wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1')

      expect(trackAttributedServerEvent).not.toHaveBeenCalled()
    })

    it('does not capture when activation returns valid but inactive', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        keygenJson({ status: 200, data: { valid: true, activated: false, status: 'inactive' } }),
      )

      const res = await call(
        'wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1&anon_id=anon-123',
      )

      expect(await res.json()).toEqual({ success: true, activated: false })
      expect(trackAttributedServerEvent).not.toHaveBeenCalled()
    })

    it('does not capture on a status poll, only on activation', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))

      await call('wc-api=am-software-api&request=status&api_key=KEY&instance=site-1&anon_id=anon-123')

      expect(trackAttributedServerEvent).not.toHaveBeenCalled()
    })

    it('does not capture when activation fails', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        keygenJson({ status: 404, message: 'A customer account does not exist for this API Key.' }, 404),
      )

      await call('wc-api=am-software-api&request=activation&api_key=BAD&instance=site-1&anon_id=anon-123')

      expect(trackAttributedServerEvent).not.toHaveBeenCalled()
    })

    it('never lets an attribution failure disturb the activation reply', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(keygenJson(ACTIVE))
      trackAttributedServerEvent.mockImplementationOnce(() => {
        throw new Error('posthog client boom')
      })

      const res = await call(
        'wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1&anon_id=anon-123',
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, activated: true })
    })
  })
})
