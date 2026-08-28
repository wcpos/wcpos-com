import { NextRequest, NextResponse } from 'next/server'
import { initiateOAuth } from '@/lib/oauth'
import { authLogger } from '@/lib/logger'
import {
  ALLOWED_PROVIDERS,
  OAUTH_LINK_COOKIE,
  OAUTH_REDIRECT_COOKIE,
  OAUTH_REDIRECT_COOKIE_OPTIONS,
  encodeOAuthLinkCookie,
} from '@/lib/oauth-providers'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { getImpersonation } from '@/lib/impersonation'
import { type Locale } from '@/i18n/config'
import { supportedBaseLocaleOrDefault } from '@/lib/locale-preferences'
import { loginPathForLocale } from '@/lib/login-redirect'
import { localizeRedirectPath, sanitizeRedirectPath } from '@/lib/safe-redirect'

function requestLocale(request: NextRequest): Locale {
  return supportedBaseLocaleOrDefault(request.nextUrl.searchParams.get('locale'))
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
    const linkIntent = request.nextUrl.searchParams.get('intent') === 'link'

    if (linkIntent) {
      const [customer, impersonation] = await Promise.all([
        getSessionCustomer(),
        getImpersonation(),
      ])
      if (!customer || impersonation) {
        return NextResponse.redirect(
          new URL(localizeRedirectPath('/account/profile', locale), request.url)
        )
      }
    }

    const location = await initiateOAuth(provider, callbackUrl.toString())
    // The provider round-trips `state`; it is the only value that ties the
    // callback back to this browser, so a link intent cannot proceed without it.
    const state = new URL(location).searchParams.get('state')
    if (linkIntent && !state) {
      authLogger.error`OAuth link initiate for ${provider} returned no state`
      return NextResponse.redirect(
        new URL(localizeRedirectPath('/account/profile', locale), request.url)
      )
    }

    const response = NextResponse.redirect(location)
    // Always set (not only for non-default targets) so a stale cookie from an
    // abandoned flow can never hijack a fresh sign-in's destination.
    response.cookies.set(
      OAUTH_REDIRECT_COOKIE,
      localizedRedirectTo,
      OAUTH_REDIRECT_COOKIE_OPTIONS
    )
    if (linkIntent && state) {
      response.cookies.set(
        OAUTH_LINK_COOKIE,
        encodeOAuthLinkCookie(provider, state),
        OAUTH_REDIRECT_COOKIE_OPTIONS
      )
    }
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
