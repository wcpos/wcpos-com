import { describe, expect, it } from 'vitest'
import { evaluateDiscordProEntitlement } from './entitlement'
import type { LicenseDetail } from '@/types/license'

function license(overrides: Partial<LicenseDetail>): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-TEST',
    status: 'active',
    expiry: null,
    maxMachines: 1,
    machines: [],
    metadata: {},
    policyId: 'policy_1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('evaluateDiscordProEntitlement', () => {
  const now = new Date('2026-06-11T00:00:00Z')

  it('grants the Discord Pro role for active licenses regardless of Keygen casing', () => {
    expect(
      evaluateDiscordProEntitlement([
        license({ status: 'ACTIVE', expiry: '2026-12-01T00:00:00Z' }),
      ], now)
    ).toEqual({ state: 'entitled' })
  })

  it('does not grant the Discord Pro role for expired licenses', () => {
    expect(
      evaluateDiscordProEntitlement([
        license({ status: 'expired', expiry: '2026-01-01T00:00:00Z' }),
      ], now)
    ).toEqual({ state: 'not_entitled' })
  })

  it('treats suspended and revoked licenses as not entitled', () => {
    expect(
      evaluateDiscordProEntitlement([
        license({ status: 'suspended' }),
        license({ status: 'revoked' }),
      ], now)
    ).toEqual({ state: 'not_entitled' })
  })

  it('marks unverifiable licenses as unknown so sync never demotes on missing data', () => {
    expect(
      evaluateDiscordProEntitlement([license({ status: 'unknown' })], now)
    ).toEqual({ state: 'unknown' })
  })

  it('grants when at least one license is active even if another is unknown', () => {
    expect(
      evaluateDiscordProEntitlement([
        license({ status: 'unknown' }),
        license({ status: 'active', expiry: null }),
      ], now)
    ).toEqual({ state: 'entitled' })
  })
})
