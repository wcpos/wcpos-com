import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LIFETIME_PRO_POLICY_ID, YEARLY_PRO_POLICY_ID } from '@/lib/plans'
import type { LicenseDetail } from '@/types/license'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  licenseLogger: { error: vi.fn() },
}))

import { getResolvedCustomerLicenses } from '@/lib/customer-licenses'
import { getProOwnership } from './pro-ownership'

function license(overrides: Partial<LicenseDetail>): LicenseDetail {
  return {
    id: 'lic',
    key: 'KEY',
    status: 'active',
    expiry: null,
    maxMachines: 2,
    activationCount: 0,
    machines: [],
    metadata: {},
    policyId: YEARLY_PRO_POLICY_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const resolved = vi.mocked(getResolvedCustomerLicenses)
const FUTURE = '2099-03-14T00:00:00.000Z'
const LATER = '2099-06-01T00:00:00.000Z'
const PAST = '2020-03-14T00:00:00.000Z'

describe('getProOwnership', () => {
  beforeEach(() => resolved.mockReset())

  it('is null for a signed-out visitor or one with no licence', async () => {
    resolved.mockResolvedValueOnce({ authenticated: false, licenses: [] })
    expect(await getProOwnership()).toBeNull()
    resolved.mockResolvedValueOnce({ authenticated: true, licenses: [] })
    expect(await getProOwnership()).toBeNull()
  })

  it('names the latest running Yearly expiry', async () => {
    resolved.mockResolvedValueOnce({
      authenticated: true,
      licenses: [license({ expiry: FUTURE }), license({ id: 'b', expiry: LATER })],
    })
    expect(await getProOwnership()).toEqual({ yearlyUntil: LATER })
  })

  it('still counts an expired Yearly licence as owning Pro, without a date', async () => {
    resolved.mockResolvedValueOnce({
      authenticated: true,
      licenses: [license({ status: 'expired', expiry: PAST })],
    })
    expect(await getProOwnership()).toEqual({ yearlyUntil: null })
  })

  it('gives no Yearly date to a Lifetime holder', async () => {
    resolved.mockResolvedValueOnce({
      authenticated: true,
      licenses: [
        license({ expiry: FUTURE }),
        license({ id: 'l', policyId: LIFETIME_PRO_POLICY_ID }),
      ],
    })
    expect(await getProOwnership()).toEqual({ yearlyUntil: null })
  })

  it('ignores revoked and suspended licences', async () => {
    resolved.mockResolvedValueOnce({
      authenticated: true,
      licenses: [
        license({ status: 'revoked', expiry: FUTURE }),
        license({ id: 's', status: 'suspended', expiry: FUTURE }),
      ],
    })
    expect(await getProOwnership()).toBeNull()
  })

  it('sells as to anyone when the lookup fails', async () => {
    resolved.mockRejectedValueOnce(new Error('keygen down'))
    expect(await getProOwnership()).toBeNull()
  })
})
