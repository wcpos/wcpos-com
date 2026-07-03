import { describe, it, expect, vi } from 'vitest'
import { checkOAuthProviders } from './oauth-health'

// Owner-preferred canonical (apex); Vercel currently 308s it to www — the
// mock fetcher reproduces that hop so every test exercises the follow logic.
const APEX = 'https://wcpos.com'
const WWW = 'https://www.wcpos.com'

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
 * Google authorize page fetch returns googlePageBody.
 */
function makeFetcher({
  redirectUriFor = (p: string) => `${WWW}/api/auth/${p}/callback`,
  googlePageBody = '<html>Sign in with Google</html>',
  initiateOverride = {} as Record<string, Response>,
} = {}) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    for (const p of ['google', 'github', 'discord']) {
      if (url === `${APEX}/api/auth/${p}`) {
        return redirectTo(`${WWW}/api/auth/${p}`, 308)
      }
      if (url === `${WWW}/api/auth/${p}`) {
        if (initiateOverride[p]) return initiateOverride[p]
        return redirectTo(authorizeUrl(p, redirectUriFor(p)))
      }
    }
    if (url.startsWith('https://accounts.google.com/')) {
      return new Response(googlePageBody, { status: 200 })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

describe('checkOAuthProviders', () => {
  it('follows the apex→www hop, validates against the serving origin, and reports healthy', async () => {
    const report = await checkOAuthProviders(APEX, makeFetcher())
    expect(report.healthy).toBe(true)
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
    const report = await checkOAuthProviders(WWW, makeFetcher())
    expect(report.healthy).toBe(true)
  })

  it('flags provider_rejected when Google renders redirect_uri_mismatch', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        googlePageBody:
          '<html>Error 400: redirect_uri_mismatch — this app sent an invalid request</html>',
      })
    )
    expect(report.healthy).toBe(false)
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('provider_rejected')
    expect(google?.detail).toContain('Google Cloud Console')
  })

  it('does not flag a healthy Google page that merely mentions invalid_request in JS', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        googlePageBody:
          '<html><script>var errs = ["invalid_request","access_denied"]</script>Sign in</html>',
      })
    )
    expect(report.healthy).toBe(true)
  })

  it('flags wrong_redirect_uri when the site sends a different host (e.g. vercel.app leakage)', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        redirectUriFor: (p) =>
          p === 'discord'
            ? `https://wcpos-com-abc.vercel.app/api/auth/discord/callback`
            : `${WWW}/api/auth/${p}/callback`,
      })
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
      })
    )
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('wrong_redirect_uri')
  })

  it('flags initiate_failed when the auth route returns a non-redirect (Medusa down)', async () => {
    const report = await checkOAuthProviders(
      APEX,
      makeFetcher({
        initiateOverride: {
          google: new Response('{"error":"oauth_failed"}', { status: 500 }),
        },
      })
    )
    expect(report.healthy).toBe(false)
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.status).toBe('initiate_failed')
    expect(google?.detail).toContain('500')
  })

  it('flags initiate_failed when fetch itself throws (site unreachable)', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const report = await checkOAuthProviders(APEX, fetcher as unknown as typeof fetch)
    expect(report.healthy).toBe(false)
    expect(report.results.every((r) => r.status === 'initiate_failed')).toBe(true)
  })

  it('gives up on a same-site redirect loop instead of spinning', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const other = url.hostname === 'wcpos.com' ? WWW : APEX
      return redirectTo(`${other}${url.pathname}`, 308)
    })
    const report = await checkOAuthProviders(APEX, fetcher as unknown as typeof fetch)
    expect(report.healthy).toBe(false)
    expect(report.results.every((r) => r.status === 'initiate_failed')).toBe(true)
    expect(report.results[0].detail).toContain('redirect loop')
  })

  it('normalizes a trailing slash on the base URL', async () => {
    const report = await checkOAuthProviders(`${APEX}/`, makeFetcher())
    expect(report.healthy).toBe(true)
  })
})
