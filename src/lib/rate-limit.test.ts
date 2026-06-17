import { describe, it, expect, vi } from 'vitest'

// No Upstash configured → limiter must fail open (never block a customer).
vi.mock('@/utils/env', () => ({
  env: {
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  },
}))

import { createRateLimiter, clientIp } from './rate-limit'

describe('createRateLimiter (unconfigured)', () => {
  it('fails open with success=true when Upstash is not configured', async () => {
    const limiter = createRateLimiter({ prefix: 'test', limit: 1, window: '1 m' })
    expect(await limiter.consume('k')).toMatchObject({ success: true })
    // Repeated calls still succeed — there is no backing store to count against.
    expect(await limiter.consume('k')).toMatchObject({ success: true })
  })
})

describe('clientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    })
    expect(clientIp(req)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip then "unknown"', () => {
    expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': '198.51.100.2' } }))).toBe(
      '198.51.100.2'
    )
    expect(clientIp(new Request('http://x'))).toBe('unknown')
  })
})
