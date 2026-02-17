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
  assetUrl: string
}

export function normalizeReleaseVersion(version: string): string {
  return version.replace(/^v/i, '')
}

function getPrimaryZipAsset(assets: Array<{ name: string; browser_download_url: string }>) {
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
        assetUrl: asset.browser_download_url,
      } satisfies ProPluginRelease
    })
    .filter((release): release is ProPluginRelease => Boolean(release))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
}

function isLicenseActive(license: LicenseDetail, now: Date): boolean {
  const status = license.status.toLowerCase()
  if (status !== 'active') return false

  if (!license.expiry) return true
  return new Date(license.expiry).getTime() >= now.getTime()
}

function getLatestExpiry(licenses: LicenseDetail[]): Date | null {
  let latest: Date | null = null

  for (const license of licenses) {
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
  licenses: LicenseDetail[],
  now: Date = new Date()
): boolean {
  if (licenses.some((license) => isLicenseActive(license, now))) {
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
