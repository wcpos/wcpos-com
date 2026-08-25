import { describe, expect, it } from 'vitest'
import {
  getPlanByHandle,
  getPlanByPolicyId,
  LIFETIME_PRO_POLICY_ID,
  YEARLY_PRO_POLICY_ID,
  type PlanId,
} from './plans'

describe('getPlanByHandle', () => {
  it('maps the yearly product handle', () => {
    const plan = getPlanByHandle('wcpos-pro-yearly')
    expect(plan?.id).toBe<PlanId>('yearly')
    expect(plan?.labelKey).toBe('planYearly')
  })
  it('maps the lifetime product handle', () => {
    const plan = getPlanByHandle('wcpos-pro-lifetime')
    expect(plan?.id).toBe<PlanId>('lifetime')
    expect(plan?.labelKey).toBe('planLifetime')
  })
  it('returns null for an unknown handle', () => {
    expect(getPlanByHandle('wcpos-pro-monthly')).toBeNull()
    expect(getPlanByHandle('')).toBeNull()
  })
})

describe('getPlanByPolicyId', () => {
  it('maps the yearly policy UUID', () => {
    expect(getPlanByPolicyId(YEARLY_PRO_POLICY_ID)?.id).toBe<PlanId>('yearly')
  })

  it('maps the lifetime policy UUID', () => {
    expect(getPlanByPolicyId(LIFETIME_PRO_POLICY_ID)?.id).toBe<PlanId>(
      'lifetime'
    )
  })

  it('returns null for an unregistered policy id (the mislabel-bug fix)', () => {
    // Previously the else-branch labeled ALL of these "Lifetime".
    expect(getPlanByPolicyId('unknown')).toBeNull()
    expect(getPlanByPolicyId('some-other-policy-uuid')).toBeNull()
    expect(getPlanByPolicyId('')).toBeNull()
  })

  // Guards the bug this replaced: the lifetime id used to come from an optional
  // env var that was never set in production, so every lifetime licence
  // resolved to null and rendered with no plan badge. A constant cannot be
  // unset, and these two assertions fail loudly if either id is ever blanked.
  it('has both plan policy ids populated and distinct', () => {
    expect(YEARLY_PRO_POLICY_ID).toMatch(/^[0-9a-f-]{36}$/)
    expect(LIFETIME_PRO_POLICY_ID).toMatch(/^[0-9a-f-]{36}$/)
    expect(YEARLY_PRO_POLICY_ID).not.toBe(LIFETIME_PRO_POLICY_ID)
  })

  it('resolves every registered plan to a distinct id', () => {
    const yearly = getPlanByPolicyId(YEARLY_PRO_POLICY_ID)
    const lifetime = getPlanByPolicyId(LIFETIME_PRO_POLICY_ID)
    expect(yearly?.labelKey).toBe('planYearly')
    expect(lifetime?.labelKey).toBe('planLifetime')
  })
})
