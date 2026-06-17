import { describe, expect, it } from 'vitest'
import {
  evaluateLicenseEntitlement,
  getExpiringSoonExpiry,
  getLatestEntitledExpiry,
  getLicenseDisplayStatus,
  hasActiveLicense,
  isLicenseActive,
  isLicenseExpiringSoon,
  isReleaseAllowedForLicenses,
  summarizeDownloadAccess,
  type LicenseLifecycle,
} from './license'

const NOW = new Date('2026-06-15T00:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(NOW + n * DAY).toISOString()

const lic = (
  status: LicenseLifecycle['status'],
  expiry: string | null
): LicenseLifecycle => ({ status, expiry })

describe('getLicenseDisplayStatus', () => {
  it('keeps active when expiry is in the future', () => {
    expect(getLicenseDisplayStatus(lic('active', daysFromNow(10)), NOW)).toBe(
      'active'
    )
  })
  it('keeps active for a lifetime (null expiry) license', () => {
    expect(getLicenseDisplayStatus(lic('active', null), NOW)).toBe('active')
  })
  it('downgrades active-but-past-expiry to expired', () => {
    expect(getLicenseDisplayStatus(lic('active', daysFromNow(-1)), NOW)).toBe(
      'expired'
    )
  })
  it('fails closed to expired on unparseable expiry', () => {
    expect(getLicenseDisplayStatus(lic('active', 'not-a-date'), NOW)).toBe(
      'expired'
    )
  })
  it('passes non-active statuses through unchanged', () => {
    expect(getLicenseDisplayStatus(lic('suspended', null), NOW)).toBe(
      'suspended'
    )
    expect(getLicenseDisplayStatus(lic('unknown', null), NOW)).toBe('unknown')
  })
})

describe('isLicenseActive', () => {
  it('true for active future-expiry and active lifetime', () => {
    expect(isLicenseActive(lic('active', daysFromNow(1)), NOW)).toBe(true)
    expect(isLicenseActive(lic('active', null), NOW)).toBe(true)
  })
  it('false for active-but-expired, and for non-active states', () => {
    expect(isLicenseActive(lic('active', daysFromNow(-1)), NOW)).toBe(false)
    expect(isLicenseActive(lic('expired', null), NOW)).toBe(false)
    expect(isLicenseActive(lic('suspended', daysFromNow(10)), NOW)).toBe(false)
  })
})

describe('hasActiveLicense', () => {
  it('true when any license is active', () => {
    expect(
      hasActiveLicense([lic('expired', null), lic('active', null)], NOW)
    ).toBe(true)
  })
  it('false for an empty set', () => {
    expect(hasActiveLicense([], NOW)).toBe(false)
  })
})

describe('evaluateLicenseEntitlement', () => {
  it('entitled for an active in-term license', () => {
    expect(evaluateLicenseEntitlement([lic('active', daysFromNow(10))], NOW)).toBe(
      'entitled'
    )
  })
  it('entitled for an active lifetime (null expiry) license', () => {
    expect(evaluateLicenseEntitlement([lic('active', null)], NOW)).toBe('entitled')
  })
  it('entitled when any license is active even if another is unverifiable', () => {
    expect(
      evaluateLicenseEntitlement([lic('unknown', null), lic('active', null)], NOW)
    ).toBe('entitled')
  })
  it('not_entitled for an expired license', () => {
    expect(
      evaluateLicenseEntitlement([lic('expired', daysFromNow(-1))], NOW)
    ).toBe('not_entitled')
  })
  it('not_entitled for suspended and revoked licenses', () => {
    expect(
      evaluateLicenseEntitlement([lic('suspended', null), lic('revoked', null)], NOW)
    ).toBe('not_entitled')
  })
  it('not_entitled for an empty set', () => {
    expect(evaluateLicenseEntitlement([], NOW)).toBe('not_entitled')
  })
  it('unverifiable for an unknown license, so callers never demote on missing data', () => {
    expect(evaluateLicenseEntitlement([lic('unknown', null)], NOW)).toBe(
      'unverifiable'
    )
  })
  it('unverifiable for an active license whose expiry will not parse', () => {
    expect(evaluateLicenseEntitlement([lic('active', 'not-a-date')], NOW)).toBe(
      'unverifiable'
    )
  })
  it('agrees with hasActiveLicense at the exact expiry instant (>= boundary)', () => {
    const atBoundary = [lic('active', new Date(NOW).toISOString())]
    expect(evaluateLicenseEntitlement(atBoundary, NOW)).toBe('entitled')
    expect(hasActiveLicense(atBoundary, NOW)).toBe(true)
  })
})

describe('getLatestEntitledExpiry', () => {
  it('returns the max expiry across active/expired licenses', () => {
    const latest = getLatestEntitledExpiry([
      lic('expired', daysFromNow(-10)),
      lic('active', daysFromNow(5)),
    ])
    expect(latest).toBe(daysFromNow(5))
  })
  it('ignores suspended and revoked licenses', () => {
    expect(
      getLatestEntitledExpiry([lic('suspended', daysFromNow(100))])
    ).toBeNull()
    expect(
      getLatestEntitledExpiry([lic('revoked', daysFromNow(100))])
    ).toBeNull()
  })
  it('returns null when nothing qualifies', () => {
    expect(getLatestEntitledExpiry([])).toBeNull()
  })
})

describe('isReleaseAllowedForLicenses', () => {
  const release = (publishedAt: string) => ({ publishedAt })
  it('allows everything when a license is active', () => {
    expect(
      isReleaseAllowedForLicenses(
        release(daysFromNow(1000)),
        [lic('active', null)],
        NOW
      )
    ).toBe(true)
  })
  it('allows releases published on/before latest expiry for expired licenses', () => {
    const licenses = [lic('expired', daysFromNow(-5))]
    expect(
      isReleaseAllowedForLicenses(release(daysFromNow(-10)), licenses, NOW)
    ).toBe(true)
    expect(
      isReleaseAllowedForLicenses(release(daysFromNow(-1)), licenses, NOW)
    ).toBe(false)
  })
  it('denies when there is no active or expired license', () => {
    expect(
      isReleaseAllowedForLicenses(
        release(daysFromNow(-100)),
        [lic('suspended', daysFromNow(-1))],
        NOW
      )
    ).toBe(false)
  })
})

describe('isLicenseExpiringSoon', () => {
  it('true inside the 30-day window', () => {
    expect(isLicenseExpiringSoon(lic('active', daysFromNow(10)), NOW)).toBe(true)
  })
  it('false outside the window and for lifetime licenses', () => {
    expect(isLicenseExpiringSoon(lic('active', daysFromNow(45)), NOW)).toBe(
      false
    )
    expect(isLicenseExpiringSoon(lic('active', null), NOW)).toBe(false)
  })
  it('false once it already displays as expired', () => {
    expect(isLicenseExpiringSoon(lic('active', daysFromNow(-1)), NOW)).toBe(
      false
    )
  })
})

describe('getExpiringSoonExpiry', () => {
  it('returns the lapsing expiry when inside the window', () => {
    const expiry = daysFromNow(10)
    expect(getExpiringSoonExpiry([lic('active', expiry)], NOW)).toBe(expiry)
  })
  it('returns null when an active lifetime license keeps access open', () => {
    expect(
      getExpiringSoonExpiry(
        [lic('active', daysFromNow(10)), lic('active', null)],
        NOW
      )
    ).toBeNull()
  })
  it('returns null when nothing is about to lapse', () => {
    expect(getExpiringSoonExpiry([lic('active', daysFromNow(45))], NOW)).toBeNull()
    expect(getExpiringSoonExpiry([], NOW)).toBeNull()
  })
})

describe('summarizeDownloadAccess', () => {
  it('reports active access with no withdrawn licenses', () => {
    expect(
      summarizeDownloadAccess([lic('active', daysFromNow(10))], NOW)
    ).toEqual({
      hasActiveLicense: true,
      latestExpiry: daysFromNow(10),
      expiryHasPassed: false,
      suspendedCount: 0,
      revokedCount: 0,
      unknownCount: 0,
    })
  })
  it('treats an active lifetime license as non-expiring access', () => {
    expect(
      summarizeDownloadAccess(
        [lic('active', null), lic('expired', daysFromNow(-2))],
        NOW
      )
    ).toEqual({
      hasActiveLicense: true,
      latestExpiry: null,
      expiryHasPassed: false,
      suspendedCount: 0,
      revokedCount: 0,
      unknownCount: 0,
    })
  })

  it('flags a passed expiry and counts withdrawn/unverifiable licenses', () => {
    const summary = summarizeDownloadAccess(
      [
        lic('expired', daysFromNow(-2)),
        lic('suspended', null),
        lic('revoked', null),
        lic('unknown', null),
      ],
      NOW
    )
    expect(summary.hasActiveLicense).toBe(false)
    expect(summary.latestExpiry).toBe(daysFromNow(-2))
    expect(summary.expiryHasPassed).toBe(true)
    expect(summary.suspendedCount).toBe(1)
    expect(summary.revokedCount).toBe(1)
    expect(summary.unknownCount).toBe(1)
  })
})
