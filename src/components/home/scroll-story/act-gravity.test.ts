import { describe, expect, it } from 'vitest'
import { ACT_HOLDS, CATCH_RADIUS, nearestHold } from './act-gravity'

describe('nearestHold', () => {
  it('pulls toward a hold from inside the catch radius', () => {
    expect(nearestHold(0.4 + CATCH_RADIUS * 0.6)).toBe(0.4)
    expect(nearestHold(0.64 - CATCH_RADIUS * 0.6)).toBe(0.64)
  })

  it('lets transitions rest where they are outside the radius', () => {
    expect(nearestHold(0.2)).toBeNull()
    expect(nearestHold(0.52)).toBeNull()
    expect(nearestHold(0.8)).toBeNull()
  })

  it('does not re-trigger once settled on a plateau (dead zone)', () => {
    for (const hold of ACT_HOLDS) {
      expect(nearestHold(hold)).toBeNull()
      expect(nearestHold(hold + 0.002)).toBeNull()
    }
  })

  it('picks the nearer hold when two are conceivable', () => {
    expect(nearestHold(0.6)).toBe(0.64)
  })
})
