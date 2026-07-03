import { describe, it, expect, vi } from 'vitest'
import { checkOAuthProviders } from './oauth-health'

const BASE = 'https://www.wcpos.com'

function redirectTo(location: string): Response {
  return new Response(null, { status: 307, headers: { location } })
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

/** fetch stub: initiate routes redirect to the provider; Google page fetch returns pageBody. */
function makeFetcher({
  redirectUriFor = (p: string) => `${BASE}/api/auth/${p}/callback`,
  googlePageBody = '<html>Sign in with Google</html>',
  initiateOverride = {} as Record<string, Response>,
} = {}) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    for (const p of ['google', 'github', 'discord']) {
      if (url === `${BASE}/api/auth/${p}`) {
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
  it('reports healthy when every provider redirects with the exact callback and Google accepts it', async () => {
    const report = await checkOAuthProviders(BASE, makeFetcher())
    expect(report.healthy).toBe(true)
    expect(report.results).toHaveLength(3)
    const google = report.results.find((r) => r.provider === 'google')
    expect(google?.registrationVerified).toBe(true)
    const github = report.results.find((r) => r.provider === 'github')
    expect(github?.registrationVerified).toBe(false)
  })

  it('flags provider_rejected when Google renders redirect_uri_mismatch', async () => {
    const report = await checkOAuthProviders(
      BASE,
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

  it('flags wrong_redirect_uri when the site sends a different host (e.g. vercel.app leakage)', async () => {
    const report = await checkOAuthProviders(
      BASE,
      makeFetcher({
        redirectUriFor: (p) =>
          p === 'discord'
            ? `https://wcpos-com-abc.vercel.app/api/auth/discord/callback`
            : `${BASE}/api/auth/${p}/callback`,
      })
    )
    expect(report.healthy).toBe(false)
    const discord = report.results.find((r) => r.provider === 'discord')
    expect(discord?.status).toBe('wrong_redirect_uri')
    expect(discord?.redirectUri).toContain('vercel.app')
  })

  it('flags initiate_failed when the auth route bounces back to /login instead of the provider', async () => {
    const report = await checkOAuthProviders(
      BASE,
      makeFetcher({
        initiateOverride: {
          github: redirectTo(`${BASE}/login?error=oauth_failed`),
        },
      })
    )
    expect(report.healthy).toBe(false)
    const github = report.results.find((r) => r.provider === 'github')
    expect(github?.status).toBe('initiate_failed')
  })

  it('flags initiate_failed when the auth route returns a non-redirect (Medusa down)', async () => {
    const report = await checkOAuthProviders(
      BASE,
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
    const report = await checkOAuthProviders(BASE, fetcher as unknown as typeof fetch)
    expect(report.healthy).toBe(false)
    expect(report.results.every((r) => r.status === 'initiate_failed')).toBe(true)
  })

  it('normalizes a trailing slash on the base URL', async () => {
    const report = await checkOAuthProviders(`${BASE}/`, makeFetcher())
    expect(report.healthy).toBe(true)
  })
})
