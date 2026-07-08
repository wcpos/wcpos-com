import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import {
  ANALYTICS_DISTINCT_ID_COOKIE,
  getDistinctIdCookieOptions,
  newDistinctId,
} from '@/lib/analytics/distinct-id'
import { readAnalyticsConsentFromCookieHeader } from '@/lib/analytics/consent'
import { MEDUSA_TOKEN_COOKIE } from '@/lib/medusa-cookie'
import { localeFromPath, localizeRedirectPath } from '@/lib/safe-redirect'

const COOKIE_NAME = MEDUSA_TOKEN_COOKIE
const UPDATES_HOSTNAME = 'updates.wcpos.com'
const MAIN_SITE_ORIGIN = 'https://wcpos.com'

// Set on requests inside the account area so server code can scope
// impersonation to /account only (see src/lib/impersonation.ts).
const ACCOUNT_REQUEST_HEADER = 'x-wcpos-account-request'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Sets the analytics distinct-id cookie only when the visitor has granted
 * analytics consent (GDPR):
 *
 * - consent granted -> set a distinct-id cookie if one is missing
 * - consent denied  -> remove any existing distinct-id cookie
 * - no decision yet -> do nothing (existing cookies are not refreshed)
 */
function withDistinctIdCookie(request: NextRequest, response: NextResponse) {
  // Read from the raw Cookie header, not request.cookies.get(): during the
  // migration to the shared `.wcpos.com` cookie a visitor can carry both a
  // legacy host-scoped and the new shared cookie under the same name, and
  // request.cookies collapses those to one arbitrary value. The header reader
  // reconciles duplicates fail-closed so a later denial is always honored.
  const consent = readAnalyticsConsentFromCookieHeader(
    request.headers.get('cookie')
  )
  const existingDistinctId = request.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value

  if (consent === 'denied') {
    if (existingDistinctId) {
      response.cookies.delete(ANALYTICS_DISTINCT_ID_COOKIE)
    }
    return response
  }

  if (consent !== 'granted') {
    return response
  }

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
  const hostname = request.nextUrl.hostname.toLowerCase()

  // Only THIS middleware may set the account-request header. Strip any
  // client-supplied value up front so a spoofed `x-wcpos-account-request: 1`
  // on a non-account route can never reach server code via `headers()` and
  // defeat the /account impersonation scoping. Downstream branches thread this
  // sanitized copy (setting the header back on only for account paths).
  const sanitizedHeaders = new Headers(request.headers)
  sanitizedHeaders.delete(ACCOUNT_REQUEST_HEADER)

  // Legacy WooCommerce API Manager licence calls from the deployed Pro plugin
  // fleet still target wcpos.com/?wc-api=am-software-api (activation, etc.).
  // Bridge them to the Keygen-backed compatibility shim. See
  // src/app/api/legacy/wc-am/route.ts.
  if (request.nextUrl.searchParams.get('wc-api') === 'am-software-api') {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = '/api/legacy/wc-am'
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers: sanitizedHeaders },
    })
  }

  // Handle updates.wcpos.com — restrict to API routes only
  if (hostname === UPDATES_HOSTNAME) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.next({ request: { headers: sanitizedHeaders } })
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

    const redirectUrl = new URL(pathname, MAIN_SITE_ORIGIN)
    redirectUrl.search = request.nextUrl.search
    return withDistinctIdCookie(request, NextResponse.redirect(redirectUrl, 301))
  }

  // API routes don't need locale processing. Account APIs get the
  // account-request header so impersonation is scoped to /account.
  if (pathname.startsWith('/api/')) {
    if (
      pathname.startsWith('/api/account/') ||
      pathname === '/api/store/cart' ||
      pathname.startsWith('/api/store/cart/')
    ) {
      const headers = new Headers(sanitizedHeaders)
      headers.set(ACCOUNT_REQUEST_HEADER, '1')
      return NextResponse.next({ request: { headers } })
    }
    return NextResponse.next({ request: { headers: sanitizedHeaders } })
  }

  // Strip locale prefix for auth checks (e.g., /fr/account -> /account)
  const localePattern = routing.locales.join('|')
  const localeRegex = new RegExp(`^/(${localePattern})(?=/|$)`)
  const pathnameWithoutLocale = pathname.replace(localeRegex, '') || '/'
  const pathnameWithQuery = `${pathnameWithoutLocale}${request.nextUrl.search}`
  const isAccountPath =
    pathnameWithoutLocale === '/account' ||
    pathnameWithoutLocale.startsWith('/account/')

  // Protected routes: /account/* requires a medusa-token cookie.
  // /pro/checkout is deliberately NOT gated: signed-out buyers create their
  // account inline in the checkout's first step (the cart APIs it calls
  // still enforce auth server-side).
  const requiresAuth = isAccountPath

  if (requiresAuth) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const loginUrl = new URL(
        localizeRedirectPath('/login', localeFromPath(pathname)),
        request.url
      )
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
        NextResponse.redirect(
          new URL(
            localizeRedirectPath('/account', localeFromPath(pathname)),
            request.url
          )
        )
      )
    }
  }

  // Inside /account, stamp the account-request header before locale routing so
  // impersonation is honored only here. next-intl copies the incoming request's
  // headers onto the response it forwards (`NextResponse.rewrite`/`.next` with
  // `{ request: { headers } }`), so a header set on the request it receives
  // propagates to the RSC layer via `headers()`.
  if (isAccountPath) {
    const headers = new Headers(sanitizedHeaders)
    headers.set(ACCOUNT_REQUEST_HEADER, '1')
    const requestWithHeader = new NextRequest(request, { headers })
    return withDistinctIdCookie(request, intlMiddleware(requestWithHeader))
  }

  // Non-account render path: forward the sanitized headers (spoofed
  // account-request header removed) so `headers()` never sees it off /account.
  const sanitizedRequest = new NextRequest(request, { headers: sanitizedHeaders })
  return withDistinctIdCookie(request, intlMiddleware(sanitizedRequest))
}

export const config = {
  // The unanchored `.*\..*` alternative excludes every path containing a dot:
  // all static files (favicon.ico, images, opengraph-image.png/twitter-image.png)
  // follow the same root 404 rule as not-found.tsx. Only extension-less _next/*
  // internals need explicit entries, and no code or routes reference
  // extension-less metadata paths like /opengraph-image or /twitter-image.
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
