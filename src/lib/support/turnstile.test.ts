import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/utils/env', () => ({ env: { TURNSTILE_SECRET_KEY: 'secret' } }))
import { verifyTurnstile } from './turnstile'
import { TEST_TURNSTILE_SECRET_KEY } from './turnstile-keys'
import { env } from '@/utils/env'

beforeEach(() => {
  env.TURNSTILE_SECRET_KEY = 'secret'
})
afterEach(() => vi.unstubAllGlobals())

describe('verifyTurnstile', () => {
  it('returns true on a live host when siteverify succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })))
    expect(await verifyTurnstile('token', 'wcpos.com', '1.2.3.4')).toBe(true)
  })

  it('returns false on a live host when siteverify fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })))
    expect(await verifyTurnstile('token', 'wcpos.com')).toBe(false)
  })

  it('returns false on a live host for an empty token', async () => {
    expect(await verifyTurnstile('', 'wcpos.com')).toBe(false)
  })

  it('fails closed on a live host when the secret key is absent', async () => {
    env.TURNSTILE_SECRET_KEY = undefined
    expect(await verifyTurnstile('token', 'wcpos.com')).toBe(false)
  })

  it('verifies test hosts against the committed always-pass demo secret', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await verifyTurnstile('token', 'beta.wcpos.com')).toBe(true)
    const form = fetchMock.mock.calls[0][1].body as URLSearchParams
    expect(form.get('secret')).toBe(TEST_TURNSTILE_SECRET_KEY)
  })

  it('admits local dev hosts without a token or a siteverify call', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000']) {
      expect(await verifyTurnstile('', host), host).toBe(true)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails closed for unrecognized non-local hosts instead of skipping the check', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const host of ['wcpos.com.', 'evil.example.com', null, '']) {
      expect(await verifyTurnstile('token', host), String(host)).toBe(false)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails closed for an unexpected siteverify network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    expect(await verifyTurnstile('token', 'wcpos.com')).toBe(false)
  })
})
