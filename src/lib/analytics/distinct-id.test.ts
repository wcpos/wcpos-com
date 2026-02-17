import { describe, expect, it } from 'vitest'
import { ANALYTICS_DISTINCT_ID_COOKIE, newDistinctId } from './distinct-id'

describe('distinct id', () => {
  it('uses stable cookie name', () => {
    expect(ANALYTICS_DISTINCT_ID_COOKIE).toBe('wcpos-distinct-id')
  })

  it('creates non-empty ids', () => {
    expect(newDistinctId().length).toBeGreaterThan(20)
  })
})
