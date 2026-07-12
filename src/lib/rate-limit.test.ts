import { afterEach, describe, expect, it, vi } from 'vitest'

interface MockLimitResult {
  success: boolean
  remaining: number
  reason?: 'timeout'
}

async function loadRateLimit({
  configured = true,
  result = { success: true, remaining: 4 },
  error,
}: {
  configured?: boolean
  result?: MockLimitResult
  error?: Error
} = {}) {
  vi.resetModules()

  vi.doMock('@/utils/env', () => ({
    env: {
      UPSTASH_REDIS_REST_URL: configured ? 'https://redis.example.com' : undefined,
      UPSTASH_REDIS_REST_TOKEN: configured ? 'token' : undefined,
    },
  }))
  vi.doMock('@upstash/redis', () => ({ Redis: class MockRedis {} }))

  const limitMock = error
    ? vi.fn().mockRejectedValue(error)
    : vi.fn().mockResolvedValue(result)
  vi.doMock('@upstash/ratelimit', () => ({
    Ratelimit: class MockRatelimit {
      static slidingWindow() {
        return {}
      }

      limit = limitMock
    },
  }))

  return import('./rate-limit')
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/utils/env')
  vi.doUnmock('@upstash/redis')
  vi.doUnmock('@upstash/ratelimit')
})

describe('createRateLimiter', () => {
  it('classifies an unconfigured limiter as unavailable while failing open', async () => {
    const { createRateLimiter } = await loadRateLimit({ configured: false })
    const unconfigured = createRateLimiter({
      prefix: 'test',
      limit: 1,
      window: '1 m',
    })

    expect(await unconfigured.consume('k')).toEqual({
      success: true,
      remaining: Infinity,
      status: 'unavailable',
    })
  })

  it('classifies a successful SDK response as allowed', async () => {
    const { createRateLimiter } = await loadRateLimit({
      result: { success: true, remaining: 3 },
    })
    const allowed = createRateLimiter({
      prefix: 'test',
      limit: 4,
      window: '1 m',
    })

    expect(await allowed.consume('k')).toMatchObject({
      success: true,
      status: 'allowed',
    })
  })

  it('classifies a rejected SDK response as limited', async () => {
    const { createRateLimiter } = await loadRateLimit({
      result: { success: false, remaining: 0 },
    })
    const limited = createRateLimiter({
      prefix: 'test',
      limit: 1,
      window: '1 m',
    })

    expect(await limited.consume('k')).toMatchObject({
      success: false,
      status: 'limited',
    })
  })

  it('classifies an SDK timeout as unavailable while failing open', async () => {
    const { createRateLimiter } = await loadRateLimit({
      result: { success: true, remaining: 2, reason: 'timeout' },
    })
    const timedOut = createRateLimiter({
      prefix: 'test',
      limit: 4,
      window: '1 m',
    })

    expect(await timedOut.consume('k')).toMatchObject({
      success: true,
      status: 'unavailable',
    })
  })

  it('classifies an SDK exception as unavailable while failing open', async () => {
    const { createRateLimiter } = await loadRateLimit({
      error: new Error('Redis unavailable'),
    })
    const throws = createRateLimiter({
      prefix: 'test',
      limit: 1,
      window: '1 m',
    })

    expect(await throws.consume('k')).toMatchObject({
      success: true,
      status: 'unavailable',
    })
  })
})

describe('clientIp', () => {
  it('takes the first x-forwarded-for entry', async () => {
    const { clientIp } = await loadRateLimit({ configured: false })
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    })
    expect(clientIp(req)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip then "unknown"', async () => {
    const { clientIp } = await loadRateLimit({ configured: false })
    expect(
      clientIp(
        new Request('http://x', {
          headers: { 'x-real-ip': '198.51.100.2' },
        }),
      ),
    ).toBe('198.51.100.2')
    expect(clientIp(new Request('http://x'))).toBe('unknown')
  })
})
