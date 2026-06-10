import { describe, it, expect } from 'vitest'
import {
  getExpiringSoonExpiry,
  isLicenseExpiringSoon,
} from './license-display'
import type { LicenseDetail } from '@/types/license'

function makeLicense(overrides: Partial<LicenseDetail> = {}): LicenseDetail {
  return {
    id: 'lic-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    status: 'ACTIVE',
    expiry: '2099-01-01T00:00:00Z',
    maxMachines: 2,
    machines: [],
    metadata: { customerEmail: 'secret@example.com' },
    policyId: '261cb7e2-6e80-476e-98bd-fe7f406f258d',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}


const NOW = new Date('2026-06-10T00:00:00Z').getTime()
const DAY_MS = 24 * 60 * 60 * 1000

function daysFromNow(days: number): string {
  return new Date(NOW + days * DAY_MS).toISOString()
}

describe('isLicenseExpiringSoon', () => {
  it('flags an active license expiring within the 30-day window', () => {
    expect(
      isLicenseExpiringSoon({ status: 'active', expiry: daysFromNow(10) }, NOW)
    ).toBe(true)
  })

  it('flags an active license expiring today', () => {
    expect(
      isLicenseExpiringSoon({ status: 'ACTIVE', expiry: daysFromNow(0.5) }, NOW)
    ).toBe(true)
  })

  it('does not flag an active license expiring beyond the window', () => {
    expect(
      isLicenseExpiringSoon({ status: 'active', expiry: daysFromNow(45) }, NOW)
    ).toBe(false)
  })

  it('never flags lifetime licenses (null expiry)', () => {
    expect(
      isLicenseExpiringSoon({ status: 'active', expiry: null }, NOW)
    ).toBe(false)
  })

  it('does not flag already-expired licenses (they get expired messaging)', () => {
    expect(
      isLicenseExpiringSoon({ status: 'active', expiry: daysFromNow(-1) }, NOW)
    ).toBe(false)
    expect(
      isLicenseExpiringSoon(
        { status: 'expired', expiry: daysFromNow(10) },
        NOW
      )
    ).toBe(false)
  })

  it('does not flag suspended or unknown licenses', () => {
    expect(
      isLicenseExpiringSoon(
        { status: 'suspended', expiry: daysFromNow(10) },
        NOW
      )
    ).toBe(false)
    expect(
      isLicenseExpiringSoon({ status: 'unknown', expiry: null }, NOW)
    ).toBe(false)
  })

  it('fails closed on unparseable expiry', () => {
    expect(
      isLicenseExpiringSoon({ status: 'active', expiry: 'not-a-date' }, NOW)
    ).toBe(false)
  })
})

describe('getExpiringSoonExpiry', () => {
  it('returns the expiry of a sole active license inside the window', () => {
    const expiry = daysFromNow(10)
    expect(getExpiringSoonExpiry([{ status: 'active', expiry }], NOW)).toBe(
      expiry
    )
  })

  it('returns null when an active lifetime license keeps access open', () => {
    expect(
      getExpiringSoonExpiry(
        [
          { status: 'active', expiry: daysFromNow(10) },
          { status: 'active', expiry: null },
        ],
        NOW
      )
    ).toBeNull()
  })

  it('returns null when a later active license extends access beyond the window', () => {
    expect(
      getExpiringSoonExpiry(
        [
          { status: 'active', expiry: daysFromNow(10) },
          { status: 'active', expiry: daysFromNow(200) },
        ],
        NOW
      )
    ).toBeNull()
  })

  it('uses the latest expiry when several active licenses lapse inside the window', () => {
    const later = daysFromNow(20)
    expect(
      getExpiringSoonExpiry(
        [
          { status: 'active', expiry: daysFromNow(5) },
          { status: 'active', expiry: later },
        ],
        NOW
      )
    ).toBe(later)
  })

  it('ignores expired, suspended, and unknown licenses', () => {
    expect(
      getExpiringSoonExpiry(
        [
          { status: 'expired', expiry: daysFromNow(-30) },
          { status: 'suspended', expiry: daysFromNow(10) },
          { status: 'unknown', expiry: null },
        ],
        NOW
      )
    ).toBeNull()
  })

  it('returns null for an empty license list', () => {
    expect(getExpiringSoonExpiry([], NOW)).toBeNull()
  })
})
