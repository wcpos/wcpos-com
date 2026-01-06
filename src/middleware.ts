import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for hostname-based routing
 *
 * Handles multiple domains pointing to the same Vercel deployment:
 * - updates.wcpos.com: Only allows /api/* routes (public update API)
 * - wcpos.com: Allows all routes (main site, dashboard, etc.)
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon.ico') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next()
  }

  // Handle updates.wcpos.com - restrict to API routes only
  if (hostname.includes('updates.wcpos.com') || hostname.includes('updates.')) {
    // Allow API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    // Allow health check at root for monitoring
    if (pathname === '/') {
      // Return a simple health response for the updates subdomain root
      return NextResponse.json(
        {
          service: 'wcpos-updates',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    // Redirect all other routes to main domain
    const mainDomain = hostname.replace('updates.', '')
    const redirectUrl = new URL(pathname, `https://${mainDomain}`)
    redirectUrl.search = request.nextUrl.search
    return NextResponse.redirect(redirectUrl, 301)
  }

  // For main domain (wcpos.com), allow everything
  return NextResponse.next()
}

export const config = {
  // Match all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

