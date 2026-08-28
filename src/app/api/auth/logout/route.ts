import { NextResponse } from 'next/server'
import { logout } from '@/lib/medusa-auth'
import {
  ALLOWED_PROVIDERS,
  OAUTH_LINK_COOKIE_OPTIONS,
  oauthLinkCookieName,
} from '@/lib/oauth-providers'

/**
 * An unfinished "connect a provider" round-trip belongs to the customer who
 * started it; it must not survive into whoever signs in next in this browser.
 */
function clearLinkIntents(response: NextResponse): NextResponse {
  for (const provider of ALLOWED_PROVIDERS) {
    response.cookies.set(oauthLinkCookieName(provider), '', {
      ...OAUTH_LINK_COOKIE_OPTIONS,
      maxAge: 0,
    })
  }
  return response
}

/**
 * Only same-origin relative paths may be redirect targets — "//host" and
 * "/\\host" are protocol-relative URLs to browsers.
 */
function safeRelativeTarget(value: string | null): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return '/login'
  }
  return value
}

export async function POST(request: Request) {
  await logout()
  const to = safeRelativeTarget(new URL(request.url).searchParams.get('to'))
  return clearLinkIntents(NextResponse.redirect(new URL(to, request.url), 303))
}

/**
 * GET variant used by server components to break the invalid-token redirect
 * loop: the middleware treats medusa-token cookie presence as logged-in and
 * bounces /login back to /account, while account pages bounce Medusa 401s
 * back to /login. Routing the 401 path through here destroys the bad cookie
 * before landing on /login, so the loop terminates.
 *
 * Worst case for an attacker triggering this cross-site (e.g. an <img> tag)
 * is a logout — a nuisance, not a privilege.
 */
export async function GET(request: Request) {
  await logout()
  const to = safeRelativeTarget(new URL(request.url).searchParams.get('to'))
  return clearLinkIntents(NextResponse.redirect(new URL(to, request.url), 303))
}
