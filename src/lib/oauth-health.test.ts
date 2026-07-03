import { describe, it, expect, vi } from 'vitest'
import { checkOAuthProviders } from './oauth-health'

// Owner-preferred canonical (apex); Vercel currently 308s it to www — the
// mock fetcher reproduces that hop so every test exercises the follow logic.
const APEX = 'https://wcpos.com'
const WWW = 'https://www.wcpos.com'

const NO_RETRY_DELAY = { retryDelayMs: 0 }

function redirectTo(location: string, status = 307): Response {
  return new Response(null, { status, headers: { location } })
}

function authorizeUrl(provider: string, redirectUri: string): string {
  const hosts: Record<string, string> = {
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    github: 'https://github.com/login/oauth/authorize',
    discord: 'https://discord.com/oauth2/authorize',
  }
  const url = new URL(hosts[provider])
  url.searchParams.set('client_id', 'client-123')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  return url.toString()
}

/**
 * fetch stub: apex 308s to www; www initiate routes redirect to the provider
 * with a redirect_uri derived from the www origin (matching production);
 * Google authorize page fetch returns googlePage. Pins `redirect: 'manual'`
 * on initiate fetches — switching the implementation to 'follow' would break
 * the real probe (it would follow through to the provider page and see no
 * location header) while mocked tests stayed green.
 */
function makeFetcher({
  redirectUriFor = (p: string) => `${WWW}/api/auth/${p}/callback`,
  googlePage = () => new Response('<html>Sign in with Google</html>', { status: 200 }),
  initiateOverride = {} as Record<string, () => Response>,
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    for (const p of ['google', 'github', 'discord']) {
      if (url === `${APEX}/api/auth/${p}` || url === `${WWW}/api/auth/${p}`) {
        if (init?.redirect !== 'manual') {
          throw new Error(`initiate fetch for ${p} must use redirect: 'manual'`)
        }
      }
      if (url === `${APEX}/api/auth/${p}`) {
        return redirectTo(`${WWW}/api/auth/${p}`, 308)
      }
      if (url === `${WWW}/api/auth/${p}`) {
        if (initiateOverride[p]) return initiateOverride[p]()
        return redirectTo(authorizeUrl(p, redirectUriFor(p)))
      }
    }
    if (url.startsWith('https://accounts.google.com/')) {
      return googlePage()
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

describe('checkOAuthProviders', () => {
  it('follows the apex→www hop, validates against the serving origin, and reports healthy', async () => {
    const report = await checkOAuthProviders(APEX, makeFetcher(), NO_RETRY_DELAY)
    expect(report.healthy).toBe(true)
    expect(report.inconclusive).toBe(false)
    expect(report.results).toHaveLength(3)
    for (const result of report.results) {
      expect(result.servingOrigin).toBe(WWW)
      expect(result.redirectUri).toBe(`${WWW}/api/auth/${result.provider}/callback`)
    }
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.registrationVerified).toBe(true)
    const github = report.results.find((r) => r.provider === 'github')
    expect(github?.registrationVerified).toBe(false)
  })

  it('also works with no same-site hop (probing the serving host directly)', async () => {
    const report = await checkOAuthProviders(WWW, makeFetcher(), NO_RETRY_DELAY)
    expect(report.healthy).toBe(true)
  })

  it('flags provider_rejected when Google renders redirect_uri_mismatch', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        googlePage: () =>
          new Response(
            '<html>Error 400: redirect_uri_mismatch — this app sent an invalid request</html>',
            { status: 400 }
          ),
      }),
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(false)
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('provider_rejected')
    expect(google?.registrationVerified).toBe(true)
    expect(google?.detail).toContain('Google Cloud Console')
  })

  it('degrades to inconclusive (not a hard failure) on a Google 4xx without the mismatch signature', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        googlePage: () =>
          new Response('<html>Our systems have detected unusual traffic</html>', {
            status: 429,
          }),
      }),
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(true)
    expect(report.inconclusive).toBe(true)
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('inconclusive')
    expect(google?.registrationVerified).toBe(false)
  })

  it('does not flag a healthy Google page that merely mentions invalid_request in JS', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        googlePage: () =>
          new Response(
            '<html><script>var errs = ["invalid_request","access_denied"]</script>Sign in</html>',
            { status: 200 }
          ),
      }),
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(true)
    expect(report.inconclusive).toBe(false)
  })

  it('flags wrong_redirect_uri when the site sends a different host (e.g. vercel.app leakage)', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        redirectUriFor: (p) =>
          p === 'discord'
            ? `https://wcpos-com-abc.vercel.app/api/auth/discord/callback`
            : `${WWW}/api/auth/${p}/callback`,
      }),
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(false)
    const discord = report.results.find((r) => r.provider === 'discord')
    expect(discord?.status).toBe('wrong_redirect_uri')
    expect(discord?.redirectUri).toContain('vercel.app')
    expect(discord?.servingOrigin).toBe(WWW)
  })

  it('flags wrong_redirect_uri when redirect_uri uses a wcpos host other than the serving one', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        redirectUriFor: (p) =>
          p === 'google'
            ? `${APEX}/api/auth/google/callback`
            : `${WWW}/api/auth/${p}/callback`,
      }),
      NO_RETRY_DELAY
    )
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('wrong_redirect_uri')
  })

  it('retries the initiate once, so a single blip (e.g. Medusa redeploy) does not fail', async () => {
    let googleCalls = 0
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        initiateOverride: {
          google: () =>
            ++googleCalls === 1
              ? new Response('{"error":"oauth_failed"}', { status: 500 })
              : redirectTo(authorizeUrl('google', `${WWW}/api/auth/google/callback`)),
        },
      }),
      NO_RETRY_DELAY
    )
    expect(googleCalls).toBe(2)
    expect(report.healthy).toBe(true)
  })

  it('flags initiate_failed when the auth route persistently returns a non-redirect (Medusa down)', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        initiateOverride: {
          google: () => new Response('{"error":"oauth_failed"}', { status: 500 }),
        },
      }),
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(false)
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('initiate_failed')
    expect(google?.detail).toContain('500')
    expect(google?.detail).toContain('after 1 retry')
  })

  it('flags initiate_failed when fetch itself throws (site unreachable)', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const report = await checkOAuthProviders(
      APEX,
      fetcher as unknown as typeof fetch,
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(false)
    expect(report.results.every((r) => r.status === 'initiate_failed')).toBe(true)
  })

  it('gives up on a same-site redirect loop instead of spinning', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const other = url.hostname === 'wcpos.com' ? WWW : APEX
      return redirectTo(`${other}${url.pathname}`, 308)
    })
    const report = await checkOAuthProviders(
      APEX,
      fetcher as unknown as typeof fetch,
      NO_RETRY_DELAY
    )
    expect(report.healthy).toBe(false)
    expect(report.results.every((r) => r.status === 'initiate_failed')).toBe(true)
    expect(report.results[0].detail).toContain('redirect loop')
  })

  it('normalizes a trailing slash on the base URL', async () => {
    const report = await checkOAuthProviders(`${APEX}/`, makeFetcher(), NO_RETRY_DELAY)
    expect(report.healthy).toBe(true)
  })
})
