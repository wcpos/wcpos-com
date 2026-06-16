import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/utils/env'

const configured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
const redis = configured
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! })
  : null

const ipLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, '10 m'), prefix: 'support:ip' })
  : null

export async function consumeRateLimit(ip: string): Promise<{ success: boolean; remaining: number }> {
  if (!ipLimiter) return { success: true, remaining: Infinity }
  try {
    const { success, remaining } = await ipLimiter.limit(ip)
    return { success, remaining }
  } catch (error) {
    console.warn('support/rate-limit fail-open', {
      scope: 'ip',
      error: error instanceof Error ? error.name : 'unknown',
    })
    return { success: true, remaining: Infinity }
  }
}

/** Global per-day ceiling. `day` is a YYYY-MM-DD string (passed in for testability). */
export async function consumeDailyBudget(day: string): Promise<{ success: boolean; used: number }> {
  if (!redis) return { success: true, used: 0 }
  try {
    const key = `support:budget:${day}`
    const [used] = await redis.multi().incr(key).expire(key, 60 * 60 * 26).exec<[number, 0 | 1]>()
    return { success: used <= env.SUPPORT_DAILY_QUESTION_BUDGET, used }
  } catch (error) {
    console.warn('support/rate-limit fail-open', {
      scope: 'daily_budget',
      error: error instanceof Error ? error.name : 'unknown',
    })
    return { success: true, used: 0 }
  }
}
