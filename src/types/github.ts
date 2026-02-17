/**
 * GitHub API Types
 * Based on @octokit/rest response types
 */

import type { RestEndpointMethodTypes } from '@octokit/rest'

export type GitHubRelease =
  RestEndpointMethodTypes['repos']['getLatestRelease']['response']['data']

export type GitHubAsset = GitHubRelease['assets'][number]

export interface GitHubReleaseInfo {
  tagName: string
  name: string
  body: string
  publishedAt: string
  draft: boolean
  prerelease: boolean
  assets: GitHubAsset[]
}
