import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/utils/env', () => ({ env: { TURNSTILE_SECRET_KEY: 'secret', NODE_ENV: 'production' } }))
import { verifyTurnstile } from './turnstile'

afterEach(() => vi.unstubAllGlobals())

describe('verifyTurnstile', () => {
  it('returns true when siteverify succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })))
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(true)
  })
  it('returns false when siteverify fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })))
    expect(await verifyTurnstile('token')).toBe(false)
  })
  it('returns false for an empty token', async () => {
    expect(await verifyTurnstile('')).toBe(false)
  })
})
