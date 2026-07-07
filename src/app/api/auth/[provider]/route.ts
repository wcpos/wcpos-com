import { NextRequest, NextResponse } from 'next/server'
import { initiateOAuth } from '@/lib/oauth'
import { authLogger } from '@/lib/logger'
import {
  ALLOWED_PROVIDERS,
  OAUTH_REDIRECT_COOKIE,
  OAUTH_REDIRECT_COOKIE_OPTIONS,
} from '@/lib/oauth-providers'
import { defaultLocale, locales, type Locale } from '@/i18n/config'
import { loginPathForLocale } from '@/lib/login-redirect'
import { localizeRedirectPath, sanitizeRedirectPath } from '@/lib/safe-redirect'

function requestLocale(request: NextRequest): Locale {
  const locale = request.nextUrl.searchParams.get('locale')
  return locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { errorCode: 'unsupported_provider', provider },
        { status: 400 }
      )
    }

    // The callback URL must stay byte-identical to the URI registered in the
    // provider consoles — no query params, ever (see OAUTH_REDIRECT_COOKIE).
    // The post-sign-in destination travels in a cookie instead.
    const origin = request.nextUrl.origin
    const callbackUrl = new URL(`/api/auth/${provider}/callback`, origin)
    const locale = requestLocale(request)
    const redirectTo = sanitizeRedirectPath(
      request.nextUrl.searchParams.get('redirect')
    )
    const localizedRedirectTo = localizeRedirectPath(redirectTo, locale)

    const location = await initiateOAuth(provider, callbackUrl.toString())

    const response = NextResponse.redirect(location)
    // Always set (not only for non-default targets) so a stale cookie from an
    // abandoned flow can never hijack a fresh sign-in's destination.
    response.cookies.set(
      OAUTH_REDIRECT_COOKIE,
      localizedRedirectTo,
      OAUTH_REDIRECT_COOKIE_OPTIONS
    )
    return response
  } catch (error) {
    authLogger.error`Failed to initiate OAuth: ${error}`
    const loginUrl = new URL(
      loginPathForLocale(requestLocale(request)),
      request.url
    )
    loginUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(loginUrl)
  }
}
