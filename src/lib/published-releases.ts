import type { GitHubReleaseInfo } from '@/types/github'

/** Select the newest published releases without mutating the input. */
export function selectPublishedReleases(
  releases: GitHubReleaseInfo[],
  limit: number,
): GitHubReleaseInfo[] {
  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit)
}
