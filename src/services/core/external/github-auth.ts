import 'server-only'

import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { env } from '@/utils/env'
import { infraLogger } from '@/lib/logger'

let octokitInstance: Octokit | null = null

/**
 * Get an authenticated Octokit instance using GitHub App credentials.
 * Returns an unauthenticated instance if credentials are not configured
 * (works for public repo endpoints with lower rate limits).
 */
export function getOctokit(): Octokit {
  if (octokitInstance) return octokitInstance

  if (env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID) {
    octokitInstance = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_PRIVATE_KEY,
        installationId: env.GITHUB_INSTALLATION_ID,
      },
    })
  } else {
    infraLogger.warn`GitHub App credentials not configured, using unauthenticated Octokit`
    octokitInstance = new Octokit()
  }

  return octokitInstance
}

/**
 * Get a GitHub installation access token for direct HTTP requests (e.g. fetch).
 * Returns null if App credentials are not configured.
 */
export async function getGitHubToken(): Promise<string | null> {
  if (!env.GITHUB_APP_ID || !env.GITHUB_PRIVATE_KEY || !env.GITHUB_INSTALLATION_ID) {
    return null
  }

  const octokit = getOctokit()
  const auth = await octokit.auth({ type: 'installation' }) as { token: string }
  return auth.token
}
