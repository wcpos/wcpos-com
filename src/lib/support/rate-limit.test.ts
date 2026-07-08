import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils/env', () => ({
  env: { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined, SUPPORT_DAILY_QUESTION_BUDGET: 500 },
}))
import { consumeRateLimit, consumeDailyBudget } from './rate-limit'

describe('rate-limit (unconfigured)', () => {
  it('allows requests when Upstash is not configured', async () => {
    expect(await consumeRateLimit('live', '1.2.3.4')).toMatchObject({ success: true })
    expect(await consumeDailyBudget('live', '2026-06-16')).toMatchObject({ success: true })
  })
})
