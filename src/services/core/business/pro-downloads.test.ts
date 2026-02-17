import { describe, expect, it } from 'vitest'
import type { LicenseDetail } from '@/types/license'
import {
  isReleaseAllowedForLicenses,
  normalizeReleaseVersion,
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

function makeLicense(status: string, expiry: string | null): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-AAAA-1111',
    status,
    expiry,
    maxMachines: 1,
    machines: [],
    metadata: {},
    policyId: 'policy_1',
    createdAt: '2026-01-01T00:00:00Z',
  }
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
