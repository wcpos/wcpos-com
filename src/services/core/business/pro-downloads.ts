import 'server-only'

import { githubClient } from '@/services/core/external/github-client'
import { cleanReleaseNotes } from '@/lib/release-notes'

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
    .flatMap((release) => {
      const asset = getPrimaryZipAsset(release.assets)
      if (!asset) return []

      const releaseNotes = cleanReleaseNotes(release.body || '', release.tagName)

      return [{
        version: normalizeReleaseVersion(release.tagName),
        tagName: release.tagName,
        name: release.name,
        releaseNotes,
        contentLocale: releaseNotes ? 'en' : undefined,
        publishedAt: release.publishedAt,
        assetName: asset.name,
        assetApiUrl: asset.url,
        assetUrl: asset.browser_download_url,
      } satisfies ProPluginRelease]
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
}
