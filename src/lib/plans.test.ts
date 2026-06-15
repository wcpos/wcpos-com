import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getPlanByHandle, getPlanByPolicyId, type PlanId } from './plans'

const YEARLY_UUID = '261cb7e2-6e80-476e-98bd-fe7f406f258d'

// The registry reads NEXT_PUBLIC_KEYGEN_{YEARLY,LIFETIME}_POLICY_ID at call
// time, so a developer/CI environment that sets either var would otherwise
// leak into these assertions. Snapshot and clear BOTH around every test, then
// set them explicitly only where a test is about the override behaviour.
const ENV_KEYS = [
  'NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID',
  'NEXT_PUBLIC_KEYGEN_LIFETIME_POLICY_ID',
] as const
const ORIGINAL_ENV: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    ORIGINAL_ENV[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ORIGINAL_ENV[key] === undefined) delete process.env[key]
    else process.env[key] = ORIGINAL_ENV[key]
  }
})

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
  // Env is cleared by the top-level beforeEach, so the yearly default applies.
  it('maps the default yearly policy UUID (no env override)', () => {
    expect(getPlanByPolicyId(YEARLY_UUID)?.id).toBe<PlanId>('yearly')
  })
  it('honours a NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID override', () => {
    process.env.NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID = 'yearly-override-uuid'
    expect(getPlanByPolicyId('yearly-override-uuid')?.id).toBe<PlanId>('yearly')
    // The default UUID no longer matches once overridden.
    expect(getPlanByPolicyId(YEARLY_UUID)).toBeNull()
  })
  it('treats blank or whitespace yearly policy env values as unset', () => {
    process.env.NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID = ''
    expect(getPlanByPolicyId(YEARLY_UUID)?.id).toBe<PlanId>('yearly')

    process.env.NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID = '   '
    expect(getPlanByPolicyId(YEARLY_UUID)?.id).toBe<PlanId>('yearly')
  })
  it('returns null for an unregistered policy id (the mislabel-bug fix)', () => {
    // Previously the else-branch labeled ALL of these "Lifetime".
    expect(getPlanByPolicyId('unknown')).toBeNull()
    expect(getPlanByPolicyId('some-other-policy-uuid')).toBeNull()
    expect(getPlanByPolicyId('')).toBeNull()
  })

  describe('with lifetime policy configured via env', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_KEYGEN_LIFETIME_POLICY_ID = 'lifetime-uuid-xyz'
    })
    it('maps the configured lifetime policy UUID', () => {
      expect(getPlanByPolicyId('lifetime-uuid-xyz')?.id).toBe<PlanId>(
        'lifetime'
      )
    })
    it('still returns null for an unconfigured policy', () => {
      expect(getPlanByPolicyId('nope')).toBeNull()
    })
  })

  describe('with blank lifetime policy env values', () => {
    it('treats blank or whitespace lifetime policy env values as unconfigured', () => {
      process.env.NEXT_PUBLIC_KEYGEN_LIFETIME_POLICY_ID = ''
      expect(getPlanByPolicyId('')).toBeNull()

      process.env.NEXT_PUBLIC_KEYGEN_LIFETIME_POLICY_ID = '   '
      expect(getPlanByPolicyId('   ')).toBeNull()
    })
  })
})
