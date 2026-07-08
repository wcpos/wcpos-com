import 'server-only'

import { githubClient } from '@/services/core/external/github-client'

const PRO_PLUGIN_REPO = 'woocommerce-pos-pro'

export interface ProPluginRelease {
  version: string
  tagName: string
  name: string
  releaseNotes: string
  /** GitHub release notes are authored in English. */
  contentLocale?: string
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
        contentLocale: release.body?.trim() ? 'en' : undefined,
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
