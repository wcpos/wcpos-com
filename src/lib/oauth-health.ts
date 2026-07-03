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
 *    `redirect_uri_mismatch` error code, which Google renders before login.
 *    This catches the registered-URI list in Google Cloud Console being out
 *    of date. GitHub and Discord defer that validation until after the user
 *    signs in, so their console-side registration cannot be probed
 *    unauthenticated — see docs/runbooks/oauth-providers.md.
 *
 * Failure semantics: only statuses in HARD_FAILURE_STATUSES should page.
 * `inconclusive` means Google answered with an error page that lacks the
 * mismatch signature (rate limiting / bot defense against datacenter IPs is
 * the expected cause) — the registration could not be verified either way,
 * which must not fire a fatal alert hourly.
 */

export type ProviderCheckStatus =
  | 'ok'
  | 'initiate_failed'
  | 'wrong_redirect_uri'
  | 'provider_rejected'
  | 'inconclusive'

export const HARD_FAILURE_STATUSES: readonly ProviderCheckStatus[] = [
  'initiate_failed',
  'wrong_redirect_uri',
  'provider_rejected',
]

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

/** Per-request cap so a hung Medusa/site aborts into a normal failure result
 * instead of riding the function into a silent platform timeout. */
const FETCH_TIMEOUT_MS = 10_000

/** Google serves bot-defense pages to bare non-browser requests from
 * datacenter IPs; look like a browser to keep the probe conclusive. */
const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'accept-language': 'en',
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

function isAuthorizeHost(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`)
}

const MAX_SAME_SITE_HOPS = 5

interface InitiateOutcome {
  authorizeUrl?: URL
  servingOrigin?: string
  failure?: ProviderCheckResult
}

/**
 * Follow same-site redirects manually (e.g. the Vercel primary-domain
 * redirect between apex and www) so the check works regardless of which
 * direction that redirect points, and track which origin actually served
 * the auth route — that origin is what the redirect_uri must match.
 */
async function initiate(
  baseUrl: string,
  provider: string,
  fetcher: Fetcher
): Promise<InitiateOutcome> {
  let currentUrl = new URL(`${baseUrl}/api/auth/${provider}`)

  for (let hop = 0; hop <= MAX_SAME_SITE_HOPS; hop++) {
    let response: Response
    try {
      response = await fetcher(currentUrl.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (error) {
      return {
        failure: {
          provider,
          status: 'initiate_failed',
          detail: `GET ${currentUrl} threw: ${error}`,
          registrationVerified: false,
        },
      }
    }

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return {
        failure: {
          provider,
          status: 'initiate_failed',
          detail: `GET ${currentUrl} returned ${response.status} without a provider redirect (Medusa down or provider disabled?)`,
          registrationVerified: false,
        },
      }
    }

    let next: URL
    try {
      next = new URL(location, currentUrl)
    } catch {
      return {
        failure: {
          provider,
          status: 'initiate_failed',
          detail: `GET ${currentUrl} redirected to an unparseable URL: ${location}`,
          registrationVerified: false,
        },
      }
    }

    if (isOwnedHost(next.hostname)) {
      currentUrl = next
      continue
    }
    return { authorizeUrl: next, servingOrigin: currentUrl.origin }
  }

  return {
    failure: {
      provider,
      status: 'initiate_failed',
      detail: `Gave up after ${MAX_SAME_SITE_HOPS} same-site redirects starting from ${baseUrl}/api/auth/${provider} (redirect loop?)`,
      registrationVerified: false,
    },
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function checkProvider(
  baseUrl: string,
  provider: string,
  fetcher: Fetcher,
  retryDelayMs: number
): Promise<ProviderCheckResult> {
  let outcome = await initiate(baseUrl, provider, fetcher)
  if (outcome.failure) {
    // One retry so a routine Medusa redeploy blip doesn't page fatal.
    await sleep(retryDelayMs)
    outcome = await initiate(baseUrl, provider, fetcher)
    if (outcome.failure) {
      return {
        ...outcome.failure,
        detail: `${outcome.failure.detail} (persisted after 1 retry)`,
      }
    }
  }

  const authorizeUrl = outcome.authorizeUrl!
  const servingOrigin = outcome.servingOrigin!
  const expectedRedirectUri = `${servingOrigin}/api/auth/${provider}/callback`

  const expectedHost = AUTHORIZE_HOSTS[provider]
  if (expectedHost && !isAuthorizeHost(authorizeUrl.hostname, expectedHost)) {
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
      authorizePage = await fetcher(authorizeUrl.toString(), {
        redirect: 'follow',
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      body = await authorizePage.text()
    } catch (error) {
      return {
        provider,
        status: 'inconclusive',
        detail: `Could not fetch Google authorize page: ${error}`,
        redirectUri: sentRedirectUri,
        servingOrigin,
        registrationVerified: false,
      }
    }
    // Google renders this error code pre-login when the redirect_uri is not
    // registered on the OAuth client — verified live 2026-07-03. Fatal ONLY
    // on the exact signature: it is the raw OAuth error code, stable and
    // never localized. A 4xx/5xx without it is most likely rate limiting or
    // bot defense against our datacenter egress IP — that must degrade to
    // inconclusive, not page the owner hourly.
    if (body.includes('redirect_uri_mismatch')) {
      return {
        provider,
        status: 'provider_rejected',
        redirectUri: sentRedirectUri,
        servingOrigin,
        detail: `Google rejected redirect_uri "${sentRedirectUri}" (redirect_uri_mismatch, status ${authorizePage.status}) — check the OAuth client in Google Cloud Console (see docs/runbooks/oauth-providers.md)`,
        registrationVerified: true,
      }
    }
    if (authorizePage.status >= 400) {
      return {
        provider,
        status: 'inconclusive',
        redirectUri: sentRedirectUri,
        servingOrigin,
        detail: `Google returned ${authorizePage.status} without the redirect_uri_mismatch signature (rate limiting / bot defense?) — registration not verified this run`,
        registrationVerified: false,
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
  /** No hard failures. An `inconclusive` result does NOT make this false. */
  healthy: boolean
  /** True when at least one provider could not be verified this run. */
  inconclusive: boolean
  results: ProviderCheckResult[]
}

export interface CheckOptions {
  /** Delay before the single initiate retry. Tests pass 0. */
  retryDelayMs?: number
}

export async function checkOAuthProviders(
  baseUrl: string,
  fetcher: Fetcher = fetch,
  options: CheckOptions = {}
): Promise<OAuthHealthReport> {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const retryDelayMs = options.retryDelayMs ?? 5000
  const results = await Promise.all(
    ALLOWED_PROVIDERS.map((provider) =>
      checkProvider(normalizedBase, provider, fetcher, retryDelayMs)
    )
  )
  return {
    healthy: results.every((r) => !HARD_FAILURE_STATUSES.includes(r.status)),
    inconclusive: results.some((r) => r.status === 'inconclusive'),
    results,
  }
}
