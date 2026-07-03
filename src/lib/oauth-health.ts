import 'server-only'

import { ALLOWED_PROVIDERS } from '@/lib/oauth-providers'

/**
 * OAuth provider health probe.
 *
 * Verifies, from the outside, that each sign-in provider is wired up on the
 * live site:
 *
 * 1. `GET {base}/api/auth/{provider}` must redirect to the provider's
 *    authorize page (proves the site → Medusa → provider handshake works).
 * 2. The `redirect_uri` in that authorize URL must be exactly
 *    `{base}/api/auth/{provider}/callback` (catches our side drifting — wrong
 *    host, apex vs www, staging leakage).
 * 3. For Google only: fetch the authorize page and look for the
 *    `redirect_uri_mismatch` error, which Google renders before login. This
 *    catches the registered-URI list in Google Cloud Console being out of
 *    date. GitHub and Discord defer that validation until after the user
 *    signs in, so their console-side registration cannot be probed
 *    unauthenticated — see docs/runbooks/oauth-providers.md.
 */

export type ProviderCheckStatus =
  | 'ok'
  | 'initiate_failed'
  | 'wrong_redirect_uri'
  | 'provider_rejected'

export interface ProviderCheckResult {
  provider: string
  status: ProviderCheckStatus
  /** What the site sent as redirect_uri, when it got that far. */
  redirectUri?: string
  /** Human-readable detail for alerts and the JSON response. */
  detail: string
  /** True when the provider's registered-URI list was actually verified. */
  registrationVerified: boolean
}

const AUTHORIZE_HOSTS: Record<string, string> = {
  google: 'accounts.google.com',
  github: 'github.com',
  discord: 'discord.com',
}

type Fetcher = typeof fetch

async function checkProvider(
  baseUrl: string,
  provider: string,
  fetcher: Fetcher
): Promise<ProviderCheckResult> {
  const expectedRedirectUri = `${baseUrl}/api/auth/${provider}/callback`

  let initiateResponse: Response
  try {
    initiateResponse = await fetcher(`${baseUrl}/api/auth/${provider}`, {
      redirect: 'manual',
    })
  } catch (error) {
    return {
      provider,
      status: 'initiate_failed',
      detail: `GET /api/auth/${provider} threw: ${error}`,
      registrationVerified: false,
    }
  }

  const location = initiateResponse.headers.get('location')
  if (initiateResponse.status < 300 || initiateResponse.status >= 400 || !location) {
    return {
      provider,
      status: 'initiate_failed',
      detail: `GET /api/auth/${provider} returned ${initiateResponse.status} without a provider redirect (Medusa down or provider disabled?)`,
      registrationVerified: false,
    }
  }

  let authorizeUrl: URL
  try {
    authorizeUrl = new URL(location)
  } catch {
    return {
      provider,
      status: 'initiate_failed',
      detail: `GET /api/auth/${provider} redirected to an unparseable URL: ${location}`,
      registrationVerified: false,
    }
  }

  const expectedHost = AUTHORIZE_HOSTS[provider]
  if (expectedHost && !authorizeUrl.hostname.endsWith(expectedHost)) {
    // A redirect back to /login?error=oauth_failed lands here too.
    return {
      provider,
      status: 'initiate_failed',
      detail: `Expected a redirect to ${expectedHost}, got ${authorizeUrl.hostname} (${authorizeUrl.pathname})`,
      registrationVerified: false,
    }
  }

  const sentRedirectUri = authorizeUrl.searchParams.get('redirect_uri') ?? ''
  if (sentRedirectUri !== expectedRedirectUri) {
    return {
      provider,
      status: 'wrong_redirect_uri',
      redirectUri: sentRedirectUri,
      detail: `Site sent redirect_uri "${sentRedirectUri}", expected "${expectedRedirectUri}"`,
      registrationVerified: false,
    }
  }

  if (provider === 'google') {
    let authorizePage: Response
    let body = ''
    try {
      authorizePage = await fetcher(authorizeUrl.toString(), { redirect: 'follow' })
      body = await authorizePage.text()
    } catch (error) {
      return {
        provider,
        status: 'initiate_failed',
        detail: `Could not fetch Google authorize page: ${error}`,
        redirectUri: sentRedirectUri,
        registrationVerified: false,
      }
    }
    // Google renders this error pre-login when the redirect_uri is not
    // registered on the OAuth client — verified live 2026-07-03.
    if (body.includes('redirect_uri_mismatch') || body.includes('invalid_request')) {
      return {
        provider,
        status: 'provider_rejected',
        redirectUri: sentRedirectUri,
        detail: `Google rejected redirect_uri "${sentRedirectUri}" (redirect_uri_mismatch) — add it to the OAuth client in Google Cloud Console (see docs/runbooks/oauth-providers.md)`,
        registrationVerified: true,
      }
    }
    return {
      provider,
      status: 'ok',
      redirectUri: sentRedirectUri,
      detail: 'Authorize URL correct and accepted by Google',
      registrationVerified: true,
    }
  }

  return {
    provider,
    status: 'ok',
    redirectUri: sentRedirectUri,
    detail: `Authorize URL correct (${provider} only validates registration after login, so console-side drift is not detectable here)`,
    registrationVerified: false,
  }
}

export interface OAuthHealthReport {
  healthy: boolean
  results: ProviderCheckResult[]
}

export async function checkOAuthProviders(
  baseUrl: string,
  fetcher: Fetcher = fetch
): Promise<OAuthHealthReport> {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const results = await Promise.all(
    ALLOWED_PROVIDERS.map((provider) =>
      checkProvider(normalizedBase, provider, fetcher)
    )
  )
  return {
    healthy: results.every((r) => r.status === 'ok'),
    results,
  }
}
