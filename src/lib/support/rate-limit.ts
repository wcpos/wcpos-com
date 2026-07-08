import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/utils/env'
import type { StoreEnvironmentName } from '@/lib/store-environment-name'

// Non-live hosts (beta + *.vercel.app aliases of the production deployment)
// verify against Turnstile's always-pass demo secret, so their traffic is
// unchallenged by construction. They get a deliberately small daily ceiling:
// enough for humans testing the box, useless for draining model spend.
const NON_LIVE_DAILY_BUDGET = 25

const configured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
const redis = configured
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! })
  : null

const ipLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, '10 m'), prefix: 'support:ip' })
  : null

/**
 * Per-IP sliding window, keyed per store environment so unchallenged test
 * traffic can never consume a live visitor's window.
 */
export async function consumeRateLimit(
  environment: StoreEnvironmentName,
  ip: string
): Promise<{ success: boolean; remaining: number }> {
  if (!ipLimiter) return { success: true, remaining: Infinity }
  try {
    const { success, remaining } = await ipLimiter.limit(`${environment}:${ip}`)
    return { success, remaining }
  } catch (error) {
    console.warn('support/rate-limit fail-open', {
      scope: 'ip',
      error: error instanceof Error ? error.name : 'unknown',
    })
    return { success: true, remaining: Infinity }
  }
}

/**
 * Per-day ceiling, keyed per store environment: live gets the full
 * SUPPORT_DAILY_QUESTION_BUDGET; everything else gets the small non-live
 * ceiling. `day` is a YYYY-MM-DD string (passed in for testability).
 */
export async function consumeDailyBudget(
  environment: StoreEnvironmentName,
  day: string
): Promise<{ success: boolean; used: number }> {
  if (!redis) return { success: true, used: 0 }
  try {
    const key = `support:budget:${environment}:${day}`
    const limit =
      environment === 'live' ? env.SUPPORT_DAILY_QUESTION_BUDGET : NON_LIVE_DAILY_BUDGET
    const [used] = await redis.multi().incr(key).expire(key, 60 * 60 * 26).exec<[number, 0 | 1]>()
    return { success: used <= limit, used }
  } catch (error) {
    console.warn('support/rate-limit fail-open', {
      scope: 'daily_budget',
      error: error instanceof Error ? error.name : 'unknown',
    })
    return { success: true, used: 0 }
  }
}
