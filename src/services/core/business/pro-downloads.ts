import 'server-only'

import { githubClient } from '@/services/core/external/github-client'
import type { LicenseDetail } from '@/types/license'

const PRO_PLUGIN_REPO = 'woocommerce-pos-pro'

export interface ProPluginRelease {
  version: string
  tagName: string
  name: string
  releaseNotes: string
  publishedAt: string
  assetName: string
  assetApiUrl: string
  assetUrl: string
}

export function normalizeReleaseVersion(version: string): string {
  return version.replace(/^v/i, '')
}

function getPrimaryZipAsset(
  assets: Array<{ name: string; browser_download_url: string; url: string }>
) {
  return assets.find(
    (asset) =>
      asset.name.toLowerCase().includes('woocommerce-pos-pro') &&
      asset.name.toLowerCase().endsWith('.zip')
  )
}

export async function getProPluginReleases(): Promise<ProPluginRelease[]> {
  const releases = await githubClient.getReleases(PRO_PLUGIN_REPO)

  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .map((release) => {
      const asset = getPrimaryZipAsset(release.assets)
      if (!asset) return null

      return {
        version: normalizeReleaseVersion(release.tagName),
        tagName: release.tagName,
        name: release.name,
        releaseNotes: release.body || '',
        publishedAt: release.publishedAt,
        assetName: asset.name,
        assetApiUrl: asset.url,
        assetUrl: asset.browser_download_url,
      } satisfies ProPluginRelease
    })
    .filter((release): release is ProPluginRelease => Boolean(release))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
}

/**
 * Minimal license shape needed to decide download/update entitlement.
 * Structural typing lets full LicenseDetail objects be passed as-is.
 */
export type LicenseEntitlementInput = Pick<LicenseDetail, 'status' | 'expiry'>

function isLicenseActive(license: LicenseEntitlementInput, now: Date): boolean {
  const status = license.status.toLowerCase()
  if (status !== 'active') return false

  if (!license.expiry) return true
  return new Date(license.expiry).getTime() >= now.getTime()
}

export function hasActiveLicense(
  licenses: LicenseEntitlementInput[],
  now: Date = new Date()
): boolean {
  return licenses.some((license) => isLicenseActive(license, now))
}

function getLatestExpiry(licenses: LicenseEntitlementInput[]): Date | null {
  let latest: Date | null = null

  for (const license of licenses) {
    // Only natural lifecycle states grant expiry-based access: suspended and
    // revoked licenses are administrative holds/terminations (refunds,
    // chargebacks) and grant nothing. See docs/adr/0001.
    const status = license.status.toLowerCase()
    if (status !== 'active' && status !== 'expired') continue
    if (!license.expiry) continue
    const expiry = new Date(license.expiry)
    if (Number.isNaN(expiry.getTime())) continue

    if (!latest || expiry.getTime() > latest.getTime()) {
      latest = expiry
    }
  }

  return latest
}

export function isReleaseAllowedForLicenses(
  release: ProPluginRelease,
  licenses: LicenseEntitlementInput[],
  now: Date = new Date()
): boolean {
  if (hasActiveLicense(licenses, now)) {
    return true
  }

  const latestExpiry = getLatestExpiry(licenses)
  if (!latestExpiry) return false

  return new Date(release.publishedAt).getTime() <= latestExpiry.getTime()
}

export async function findReleaseByVersion(
  version: string
): Promise<ProPluginRelease | null> {
  const releases = await getProPluginReleases()
  if (version === 'latest') {
    return releases[0] ?? null
  }

  const normalizedVersion = normalizeReleaseVersion(version)
  return (
    releases.find((release) => release.version === normalizedVersion) ?? null
  )
}
