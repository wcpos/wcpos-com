import 'server-only'

import { cacheLife } from 'next/cache'
import { getOctokit } from './github-auth'
import { infraLogger } from '@/lib/logger'
import type { GitHubRelease, GitHubReleaseInfo } from '@/types/github'

/**
 * GitHub Client
 *
 * Wrapper around Octokit for fetching releases from GitHub.
 * Protected by server-only to prevent client-side usage.
 *
 * Release fetches are cached with Next.js 'use cache' using the
 * 'api-short' profile from next.config.ts (5 min stale window),
 * replacing the previous hand-rolled in-memory TTL cache.
 */

const octokit = getOctokit()

const GITHUB_OWNER = 'wcpos'

async function fetchLatestRelease(repo: string): Promise<GitHubRelease> {
  'use cache'
  cacheLife('api-short')

  const response = await octokit.repos.getLatestRelease({
    owner: GITHUB_OWNER,
    repo,
  })

  return response.data
}

async function fetchReleases(repo: string): Promise<GitHubRelease[]> {
  'use cache'
  cacheLife('api-short')

  return octokit.paginate(octokit.repos.listReleases, {
    owner: GITHUB_OWNER,
    repo,
    per_page: 100,
  })
}

/**
 * Get the latest release for a repository
 */
export async function getLatestRelease(
  repo: string
): Promise<GitHubReleaseInfo | null> {
  try {
    return transformRelease(await fetchLatestRelease(repo))
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
    return (await fetchReleases(repo)).map(transformRelease)
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

export const githubClient = {
  getLatestRelease,
  getReleaseByTag,
  getReleases,
}
