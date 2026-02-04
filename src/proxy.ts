import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionService } from '@/services/core/auth/session-service'

/**
 * Proxy for hostname-based routing and authentication (Next.js 16+)
 *
 * Handles:
 * - Multiple domains pointing to the same Vercel deployment
 * - Route protection for dashboard areas
 *
 * Domains:
 * - updates.wcpos.com: Only allows /api/* routes (public update API)
 * - wcpos.com: Allows all routes (main site, dashboard, etc.)
 */
export async function proxy(request: NextRequest) {
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

  // Protect dashboard routes - require any authenticated user
  if (pathname.startsWith('/dashboard')) {
    const session = await SessionService.validateSession(request)

    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Refresh session if needed
    const refreshResponse = await SessionService.updateSessionMiddleware(request)
    if (refreshResponse) {
      return refreshResponse
    }
  }

  // For main domain (wcpos.com), allow everything else
  return NextResponse.next()
}

export const config = {
  // Match all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
