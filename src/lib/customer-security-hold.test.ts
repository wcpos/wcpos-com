import { describe, expect, it } from 'vitest'
import { isCustomerSecurityHeld } from './customer-security-hold'

describe('isCustomerSecurityHeld', () => {
  it('returns true only when security_hold.active is strictly true', () => {
    expect(
      isCustomerSecurityHeld({ security_hold: { active: true } })
    ).toBe(true)
    expect(
      isCustomerSecurityHeld({ security_hold: { active: false } })
    ).toBe(false)
    expect(isCustomerSecurityHeld({ security_hold: true })).toBe(false)
  })

  it.each([
    undefined,
    null,
    true,
    [],
    {},
    { security_hold: null },
    { security_hold: [] },
    { security_hold: { active: 1 } },
    { security_hold: { active: 'true' } },
  ])('does not hold malformed metadata: %j', (metadata) => {
    expect(isCustomerSecurityHeld(metadata)).toBe(false)
  })
})
