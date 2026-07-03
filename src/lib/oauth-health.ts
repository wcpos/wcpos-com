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
 *    `{serving origin}/api/auth/{provider}/callback`, where the serving
 *    origin is discovered by following same-site redirects from the base
 *    (apex ⇄ www can point either way in Vercel's primary-domain setting;
 *    the owner-preferred canonical is apex wcpos.com). This catches our side
 *    drifting — wrong host, vercel.app leakage, staging host-keying.
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
  /**
   * The wcpos origin that actually issued the provider redirect, after
   * following same-site hops (e.g. apex → www while Vercel's primary-domain
   * redirect points that way). The owner-preferred canonical is the apex;
   * this field makes the currently-serving host visible either way.
   */
  servingOrigin?: string
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

/** wcpos.com, *.wcpos.com, or localhost (dev) — hosts we own and may hop between. */
function isOwnedHost(hostname: string): boolean {
  return (
    hostname === 'wcpos.com' ||
    hostname.endsWith('.wcpos.com') ||
    hostname === 'localhost'
  )
}

const MAX_SAME_SITE_HOPS = 5

async function checkProvider(
  baseUrl: string,
  provider: string,
  fetcher: Fetcher
): Promise<ProviderCheckResult> {
  // Follow same-site redirects manually (e.g. the Vercel primary-domain
  // redirect between apex and www) so the check works regardless of which
  // direction that redirect points, and track which origin actually served
  // the auth route — that origin is what the redirect_uri must match.
  let currentUrl = new URL(`${baseUrl}/api/auth/${provider}`)
  let authorizeUrl: URL | undefined

  for (let hop = 0; hop <= MAX_SAME_SITE_HOPS; hop++) {
    let response: Response
    try {
      response = await fetcher(currentUrl.toString(), { redirect: 'manual' })
    } catch (error) {
      return {
        provider,
        status: 'initiate_failed',
        detail: `GET ${currentUrl} threw: ${error}`,
        registrationVerified: false,
      }
    }

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return {
        provider,
        status: 'initiate_failed',
        detail: `GET ${currentUrl} returned ${response.status} without a provider redirect (Medusa down or provider disabled?)`,
        registrationVerified: false,
      }
    }

    let next: URL
    try {
      next = new URL(location, currentUrl)
    } catch {
      return {
        provider,
        status: 'initiate_failed',
        detail: `GET ${currentUrl} redirected to an unparseable URL: ${location}`,
        registrationVerified: false,
      }
    }

    if (isOwnedHost(next.hostname)) {
      currentUrl = next
      continue
    }
    authorizeUrl = next
    break
  }

  if (!authorizeUrl) {
    return {
      provider,
      status: 'initiate_failed',
      detail: `Gave up after ${MAX_SAME_SITE_HOPS} same-site redirects starting from ${baseUrl}/api/auth/${provider} (redirect loop?)`,
      registrationVerified: false,
    }
  }

  const servingOrigin = currentUrl.origin
  const expectedRedirectUri = `${servingOrigin}/api/auth/${provider}/callback`

  const expectedHost = AUTHORIZE_HOSTS[provider]
  if (expectedHost && !authorizeUrl.hostname.endsWith(expectedHost)) {
    return {
      provider,
      status: 'initiate_failed',
      servingOrigin,
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
      servingOrigin,
      detail: `Site at ${servingOrigin} sent redirect_uri "${sentRedirectUri}", expected "${expectedRedirectUri}"`,
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
        servingOrigin,
        registrationVerified: false,
      }
    }
    // Google renders this error pre-login when the redirect_uri is not
    // registered on the OAuth client — verified live 2026-07-03. Match only
    // the exact signature (plus a 4xx/5xx status): a healthy login page's JS
    // could plausibly contain generic strings like "invalid_request", and a
    // false positive here pages the owner hourly.
    if (body.includes('redirect_uri_mismatch') || authorizePage.status >= 400) {
      return {
        provider,
        status: 'provider_rejected',
        redirectUri: sentRedirectUri,
        servingOrigin,
        detail: `Google rejected the authorize request (status ${authorizePage.status}${body.includes('redirect_uri_mismatch') ? ', redirect_uri_mismatch' : ''}) for redirect_uri "${sentRedirectUri}" — check the OAuth client in Google Cloud Console (see docs/runbooks/oauth-providers.md)`,
        registrationVerified: true,
      }
    }
    return {
      provider,
      status: 'ok',
      redirectUri: sentRedirectUri,
      servingOrigin,
      detail: 'Authorize URL correct and accepted by Google',
      registrationVerified: true,
    }
  }

  return {
    provider,
    status: 'ok',
    redirectUri: sentRedirectUri,
    servingOrigin,
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
