import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/utils/env'

/**
 * Shared per-key sliding-window rate limiting, backed by the same Upstash
 * instance the support box uses. Used to protect the unauthenticated checkout
 * report-failure beacon and the per-customer download token gate.
 *
 * `src/lib/support/rate-limit.ts` predates this and keeps its own bespoke
 * limiter (with its own tests) — leave it; this is for the new limiters.
 */

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// The Upstash Duration literal (e.g. '1 m', '10 m'), derived from the API so we
// don't redeclare it.
type Duration = Parameters<typeof Ratelimit.slidingWindow>[1]

export type RateLimitStatus = 'allowed' | 'limited' | 'unavailable'

export interface RateLimitResult {
  success: boolean
  remaining: number
  status: RateLimitStatus
}

export interface KeyedRateLimiter {
  consume(key: string): Promise<RateLimitResult>
}

/**
 * Build a limiter whose legacy `success` signal remains fail-open. Callers
 * protecting sensitive mutations must inspect `status` and can fail closed
 * when Upstash is unavailable without changing existing fail-open callers.
 */
export function createRateLimiter(opts: {
  prefix: string
  limit: number
  window: Duration
}): KeyedRateLimiter {
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(opts.limit, opts.window),
        prefix: opts.prefix,
      })
    : null

  return {
    async consume(key: string): Promise<RateLimitResult> {
      if (!limiter) {
        return { success: true, remaining: Infinity, status: 'unavailable' }
      }
      try {
        const result = await limiter.limit(key)
        if (result.reason === 'timeout') {
          return {
            success: true,
            remaining: result.remaining,
            status: 'unavailable',
          }
        }
        return {
          success: result.success,
          remaining: result.remaining,
          status: result.success ? 'allowed' : 'limited',
        }
      } catch {
        // Preserve the legacy fail-open signal while exposing the outage.
        return { success: true, remaining: Infinity, status: 'unavailable' }
      }
    },
  }
}

/** First client IP from proxy headers, mirroring support/ask. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return (
    fwd?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
