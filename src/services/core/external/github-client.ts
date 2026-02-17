import 'server-only'

import { getOctokit } from './github-auth'
import { infraLogger } from '@/lib/logger'
import type { GitHubRelease, GitHubReleaseInfo } from '@/types/github'

/**
 * GitHub Client
 *
 * Wrapper around Octokit for fetching releases from GitHub.
 * Protected by server-only to prevent client-side usage.
 */

const octokit = getOctokit()

const GITHUB_OWNER = 'wcpos'

/**
 * Cache for releases to reduce GitHub API calls
 * Key: repo name, Value: { data, timestamp }
 */
const releaseCache = new Map<
  string,
  { data: GitHubRelease; timestamp: number }
>()
const releasesListCache = new Map<
  string,
  { data: GitHubRelease[]; timestamp: number }
>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get the latest release for a repository
 */
export async function getLatestRelease(
  repo: string
): Promise<GitHubReleaseInfo | null> {
  try {
    // Check cache first
    const cached = releaseCache.get(repo)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return transformRelease(cached.data)
    }

    const response = await octokit.repos.getLatestRelease({
      owner: GITHUB_OWNER,
      repo,
    })

    // Update cache
    releaseCache.set(repo, {
      data: response.data,
      timestamp: Date.now(),
    })

    return transformRelease(response.data)
  } catch (error) {
    infraLogger.error`Failed to fetch latest release for ${repo}: ${error}`
    return null
  }
}

/**
 * Get a specific release by tag
 */
export async function getReleaseByTag(
  repo: string,
  tag: string
): Promise<GitHubReleaseInfo | null> {
  try {
    // Ensure tag has 'v' prefix
    const normalizedTag = tag.startsWith('v') ? tag : `v${tag}`

    const response = await octokit.repos.getReleaseByTag({
      owner: GITHUB_OWNER,
      repo,
      tag: normalizedTag,
    })

    return transformRelease(response.data)
  } catch (error) {
    infraLogger.error`Failed to fetch release ${tag} for ${repo}: ${error}`
    return null
  }
}

/**
 * Get all releases for a repository.
 */
export async function getReleases(
  repo: string
): Promise<GitHubReleaseInfo[]> {
  try {
    const cached = releasesListCache.get(repo)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data.map(transformRelease)
    }

    const response = await octokit.paginate(octokit.repos.listReleases, {
      owner: GITHUB_OWNER,
      repo,
      per_page: 100,
    })

    releasesListCache.set(repo, {
      data: response,
      timestamp: Date.now(),
    })

    return response.map(transformRelease)
  } catch (error) {
    infraLogger.error`Failed to fetch releases for ${repo}: ${error}`
    return []
  }
}

/**
 * Transform GitHub API response to our internal type
 */
function transformRelease(release: GitHubRelease): GitHubReleaseInfo {
  return {
    tagName: release.tag_name,
    name: release.name || release.tag_name,
    body: release.body || '',
    publishedAt: release.published_at || new Date().toISOString(),
    draft: release.draft,
    prerelease: release.prerelease,
    assets: release.assets,
  }
}

/**
 * Clear the release cache (useful for testing or manual refresh)
 */
export function clearReleaseCache(): void {
  releaseCache.clear()
  releasesListCache.clear()
}

export const githubClient = {
  getLatestRelease,
  getReleaseByTag,
  getReleases,
  clearReleaseCache,
}
