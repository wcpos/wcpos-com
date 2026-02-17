import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import {
  ANALYTICS_DISTINCT_ID_COOKIE,
  getDistinctIdCookieOptions,
  newDistinctId,
} from '@/lib/analytics/distinct-id'

const COOKIE_NAME = 'medusa-token'

const intlMiddleware = createIntlMiddleware(routing)

function withDistinctIdCookie(request: NextRequest, response: NextResponse) {
  const existingDistinctId = request.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
  if (existingDistinctId) {
    return response
  }

  response.cookies.set(
    ANALYTICS_DISTINCT_ID_COOKIE,
    newDistinctId(),
    getDistinctIdCookieOptions()
  )
  return response
}

/**
 * Middleware for locale detection, route protection, and hostname-based routing.
 *
 * - Locale detection: handled by next-intl (URL prefix > cookie > Accept-Language > fallback)
 * - /account/*: requires medusa-token cookie (redirects to /login if missing)
 * - /login, /register: redirects to /account if cookie exists
 * - updates.wcpos.com: restricts to /api/* routes only
 * - /api/*: passes through without locale processing
 * - Everything else: locale middleware runs
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
      const response = NextResponse.json(
        {
          service: 'wcpos-updates',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
      return withDistinctIdCookie(request, response)
    }

    const mainDomain = hostname.replace('updates.', '')
    const redirectUrl = new URL(pathname, `https://${mainDomain}`)
    redirectUrl.search = request.nextUrl.search
    return withDistinctIdCookie(request, NextResponse.redirect(redirectUrl, 301))
  }

  // API routes don't need locale processing
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Strip locale prefix for auth checks (e.g., /fr/account -> /account)
  const localePattern = routing.locales.join('|')
  const localeRegex = new RegExp(`^/(${localePattern})(?=/|$)`)
  const pathnameWithoutLocale = pathname.replace(localeRegex, '') || '/'
  const pathnameWithQuery = `${pathnameWithoutLocale}${request.nextUrl.search}`

  // Protected routes: /account/* requires a medusa-token cookie
  const requiresAuth =
    pathnameWithoutLocale.startsWith('/account') ||
    pathnameWithoutLocale.startsWith('/pro/checkout')

  if (requiresAuth) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathnameWithQuery)
      return withDistinctIdCookie(request, NextResponse.redirect(loginUrl))
    }
  }

  // Auth pages: redirect to /account if already logged in
  if (pathnameWithoutLocale === '/login' || pathnameWithoutLocale === '/register') {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (token) {
      return withDistinctIdCookie(
        request,
        NextResponse.redirect(new URL('/account', request.url))
      )
    }
  }

  return withDistinctIdCookie(request, intlMiddleware(request))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\..*).*)'],
}
