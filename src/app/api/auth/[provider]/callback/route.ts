import { NextRequest, NextResponse } from 'next/server'
import { getSessionCustomer, updateCustomer } from '@/lib/medusa-auth'
import { establishOAuthSession } from '@/lib/oauth'
import { authLogger } from '@/lib/logger'
import { getConnectedAvatarUrlFromUserMetadata } from '@/lib/avatar'
import { recordSignInProvider } from '@/lib/auth-providers/metadata'
import {
  ALLOWED_PROVIDERS,
  OAUTH_REDIRECT_COOKIE,
  OAUTH_REDIRECT_COOKIE_OPTIONS,
} from '@/lib/oauth-providers'
import { loginPathForLocale } from '@/lib/login-redirect'
import { localeFromPath, sanitizeRedirectPath } from '@/lib/safe-redirect'
import { isOAuthErrorCode } from '@/lib/oauth-error-codes'

/** The redirect cookie is single-use: consume it on every outcome. */
function clearRedirectCookie(response: NextResponse): NextResponse {
  response.cookies.set(OAUTH_REDIRECT_COOKIE, '', {
    ...OAUTH_REDIRECT_COOKIE_OPTIONS,
    maxAge: 0,
  })
  return response
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function syncOauthProfile(
  provider: string,
  userMetadata: Record<string, string>
) {
  try {
    // Use the real session identity, never an active impersonation target, so
    // OAuth profile sync always writes to the signed-in owner's own customer.
    const customer = await getSessionCustomer()
    if (!customer) return

    const metadata = isRecord(customer.metadata) ? customer.metadata : {}
    const avatarUrl = getConnectedAvatarUrlFromUserMetadata(userMetadata)

    // Record which provider this sign-in used — Medusa never exposes the
    // provider-specific AuthIdentity to the storefront, so the profile reads
    // `auth_providers` / `last_sign_in_provider` to show truthful per-provider
    // connection state.
    const providerAlreadyKnown =
      Array.isArray(metadata.auth_providers) &&
      metadata.auth_providers.includes(provider)
    const alreadyLatest = metadata.last_sign_in_provider === provider
    const avatarUnchanged =
      !avatarUrl || avatarUrl === metadata.oauth_avatar_url

    // Nothing to persist: provider already recorded as the latest and avatar
    // unchanged.
    if (providerAlreadyKnown && alreadyLatest && avatarUnchanged) return

    let nextMetadata = recordSignInProvider(metadata, provider)
    if (avatarUrl && avatarUrl !== metadata.oauth_avatar_url) {
      nextMetadata = { ...nextMetadata, oauth_avatar_url: avatarUrl }
    }

    await updateCustomer({ metadata: nextMetadata })
  } catch (error) {
    authLogger.error`Failed to sync OAuth profile: ${error}`
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      )
    }

    // The destination travels in the cookie set at initiate time — it must
    // never be on the callback URL itself (see OAUTH_REDIRECT_COOKIE). The
    // query param is honored as a fallback for flows initiated before that
    // change deployed.
    const redirectTo = sanitizeRedirectPath(
      request.cookies.get(OAUTH_REDIRECT_COOKIE)?.value ??
        request.nextUrl.searchParams.get('redirect'),
      { stripLocalePrefix: false }
    )

    // Collect all query params from the OAuth provider (code, state, etc.)
    const callbackParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key === 'redirect') return
      callbackParams[key] = value
    })

    // establishOAuthSession owns the link-then-refresh-then-persist ordering
    // and writes the session cookie; the route only drives profile sync and
    // the redirect. Profile sync runs after the session exists (it reads the
    // session identity via getSessionCustomer) and is best-effort — it must
    // not block sign-in.
    const { payload } = await establishOAuthSession(provider, callbackParams)
    await syncOauthProfile(provider, payload.user_metadata)

    return clearRedirectCookie(
      NextResponse.redirect(new URL(redirectTo, request.url))
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    authLogger.error`OAuth callback failed: ${message}`
    const redirectTo = sanitizeRedirectPath(
      request.cookies.get(OAUTH_REDIRECT_COOKIE)?.value ??
        request.nextUrl.searchParams.get('redirect'),
      { stripLocalePrefix: false }
    )
    const loginUrl = new URL(
      loginPathForLocale(localeFromPath(redirectTo)),
      request.url
    )
    loginUrl.searchParams.set(
      'error',
      isOAuthErrorCode(message) ? message : 'oauth_failed'
    )
    return clearRedirectCookie(NextResponse.redirect(loginUrl, 303))
  }
}
