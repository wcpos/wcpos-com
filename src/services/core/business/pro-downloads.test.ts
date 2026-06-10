import { describe, expect, it } from 'vitest'
import {
  hasActiveLicense,
  isReleaseAllowedForLicenses,
  normalizeReleaseVersion,
  type LicenseEntitlementInput,
  type ProPluginRelease,
} from './pro-downloads'

function makeRelease(version: string, publishedAt: string): ProPluginRelease {
  return {
    version,
    tagName: `v${version}`,
    name: `WCPOS Pro ${version}`,
    releaseNotes: '',
    publishedAt,
    assetName: `woocommerce-pos-pro-${version}.zip`,
    assetApiUrl: `https://api.github.com/repos/wcpos/woocommerce-pos-pro/releases/assets/${version}`,
    assetUrl: `https://downloads.example.com/${version}.zip`,
  }
}

function makeLicense(
  status: string,
  expiry: string | null
): LicenseEntitlementInput {
  return { status, expiry }
}

describe('normalizeReleaseVersion', () => {
  it('removes a leading v prefix', () => {
    expect(normalizeReleaseVersion('v1.2.3')).toBe('1.2.3')
  })
})

describe('isReleaseAllowedForLicenses', () => {
  it('allows all releases when any license is active', () => {
    const release = makeRelease('1.9.0', '2026-02-01T00:00:00Z')
    const licenses = [makeLicense('active', null)]

    expect(isReleaseAllowedForLicenses(release, licenses)).toBe(true)
  })

  it('restricts expired licenses to versions released before expiry', () => {
    const beforeExpiry = makeRelease('1.8.0', '2026-01-15T00:00:00Z')
    const afterExpiry = makeRelease('1.9.0', '2026-02-15T00:00:00Z')
    const licenses = [makeLicense('expired', '2026-02-01T00:00:00Z')]

    expect(isReleaseAllowedForLicenses(beforeExpiry, licenses)).toBe(true)
    expect(isReleaseAllowedForLicenses(afterExpiry, licenses)).toBe(false)
  })
})

describe('hasActiveLicense', () => {
  const now = new Date('2026-06-01T00:00:00Z')

  it('returns true for an active license without expiry', () => {
    expect(hasActiveLicense([makeLicense('active', null)], now)).toBe(true)
  })

  it('returns true for an active license expiring in the future', () => {
    expect(
      hasActiveLicense([makeLicense('active', '2026-07-01T00:00:00Z')], now)
    ).toBe(true)
  })

  it('returns false for an active license that has expired', () => {
    expect(
      hasActiveLicense([makeLicense('active', '2026-05-01T00:00:00Z')], now)
    ).toBe(false)
  })

  it('returns false for non-active statuses and empty lists', () => {
    expect(hasActiveLicense([makeLicense('expired', null)], now)).toBe(false)
    expect(hasActiveLicense([], now)).toBe(false)
  })
})
