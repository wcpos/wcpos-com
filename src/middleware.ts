import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'medusa-token'

/**
 * Middleware for route protection and hostname-based routing.
 *
 * - /account/*: requires medusa-token cookie (redirects to /login if missing)
 * - /login, /register: redirects to /account if cookie exists
 * - updates.wcpos.com: restricts to /api/* routes only
 * - Everything else: passes through
 *
 * The middleware does NOT validate the token. Invalid tokens are rejected
 * when Medusa returns 401 on actual API calls.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Handle updates.wcpos.com — restrict to API routes only
  if (hostname.includes('updates.wcpos.com') || hostname.includes('updates.')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    if (pathname === '/') {
      return NextResponse.json(
        {
          service: 'wcpos-updates',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    const mainDomain = hostname.replace('updates.', '')
    const redirectUrl = new URL(pathname, `https://${mainDomain}`)
    redirectUrl.search = request.nextUrl.search
    return NextResponse.redirect(redirectUrl, 301)
  }

  // Protected routes: /account/* requires a medusa-token cookie
  if (pathname.startsWith('/account')) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Auth pages: redirect to /account if already logged in
  if (pathname === '/login' || pathname === '/register') {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (token) {
      return NextResponse.redirect(new URL('/account', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
