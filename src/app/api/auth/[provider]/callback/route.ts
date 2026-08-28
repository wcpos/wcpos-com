import { NextRequest, NextResponse } from 'next/server'
import { getSessionCustomer, updateCustomer } from '@/lib/medusa-auth'
import { establishOAuthSession, linkOAuthIdentity } from '@/lib/oauth'
import { authLogger } from '@/lib/logger'
import { getConnectedAvatarUrlFromUserMetadata } from '@/lib/avatar'
import {
  recordLinkedProvider,
  recordSignInProvider,
} from '@/lib/auth-providers/metadata'
import {
  ALLOWED_PROVIDERS,
  OAUTH_LINK_COOKIE_OPTIONS,
  OAUTH_REDIRECT_COOKIE,
  OAUTH_REDIRECT_COOKIE_OPTIONS,
  oauthLinkCookieName,
  parseOAuthLinkCookie,
} from '@/lib/oauth-providers'
import { loginPathForLocale } from '@/lib/login-redirect'
import { localeFromPath, sanitizeRedirectPath } from '@/lib/safe-redirect'
import { isOAuthErrorCode } from '@/lib/oauth-error-codes'
import { rootFallbackHref } from '@/lib/root-fallback-i18n'
import {
  savedCustomerLocale,
  setLocaleCookieOnResponse,
} from '@/lib/account-locale'
import { AccountSecurityHoldError } from '@/lib/api/errors'
import { AuthMethodError } from '@/lib/auth-methods'

/**
 * Both round-trip cookies are single-use: consume them on every outcome.
 * Only THIS provider's link cookie is cleared — a parallel flow for another
 * provider keeps its own binding.
 */
function clearRedirectCookie(
  response: NextResponse,
  provider: string | null
): NextResponse {
  response.cookies.set(OAUTH_REDIRECT_COOKIE, '', {
    ...OAUTH_REDIRECT_COOKIE_OPTIONS,
    maxAge: 0,
  })
  if (provider) {
    response.cookies.set(oauthLinkCookieName(provider), '', {
      ...OAUTH_LINK_COOKIE_OPTIONS,
      maxAge: 0,
    })
  }
  return response
}

function profileRedirect(
  request: NextRequest,
  locale: string,
  provider: string,
  key: 'connect' | 'connect_error',
  value: string,
  options: { consumeLink?: boolean } = {}
): NextResponse {
  const path = locale === 'en' ? '/account/profile' : `/${locale}/account/profile`
  const url = new URL(path, request.url)
  url.searchParams.set(key, value)
  // Name the provider in the error toast too.
  if (key === 'connect_error') url.searchParams.set('connect', provider)
  return clearRedirectCookie(
    NextResponse.redirect(url, 303),
    options.consumeLink === false ? null : provider
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function syncOauthProfile(
  provider: string,
  userMetadata: Record<string, string>,
  locale: string
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
    // Capture the sign-in-surface locale ONLY for accounts that have not
    // chosen one yet (new customer / first sign-in). A saved preference from
    // Profile or the language switcher is durable — never overwrite or clear
    // it on a later sign-in, even from a different-language surface.
    const hasSavedLocale =
      typeof metadata.locale === 'string' && metadata.locale.length > 0
    const localeToPersist =
      !hasSavedLocale && locale !== 'en' ? locale : undefined
    const localeUnchanged = localeToPersist === undefined

    // Nothing to persist: provider already recorded as the latest, avatar
    // unchanged, and no first-time locale to capture.
    if (providerAlreadyKnown && alreadyLatest && avatarUnchanged && localeUnchanged) return

    let nextMetadata = recordSignInProvider(metadata, provider)
    if (localeToPersist) {
      nextMetadata = { ...nextMetadata, locale: localeToPersist }
    }
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
  let providerErrorCallback = false
  let provider: string | null = null

  try {
    provider = (await params).provider

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { errorCode: 'unsupported_provider', provider },
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
    const locale = localeFromPath(redirectTo)

    const link = parseOAuthLinkCookie(
      request.cookies.get(oauthLinkCookieName(provider))?.value
    )
    if (link) {
      // A link intent NEVER falls through to sign-in. A mismatched state is a
      // callback this browser did not start; a different customer means the
      // session changed hands mid-flow. Signing either in (or linking it) is
      // exactly the substitution the binding exists to prevent.
      if (callbackParams.state !== link.state) {
        // The cookie belongs to a NEWER round-trip for this provider (a
        // second Connect click in another tab); this stale callback must not
        // consume it, or the newer callback would land in plain sign-in.
        authLogger.info`OAuth link callback for ${provider} rejected: state mismatch`
        return profileRedirect(request, locale, provider, 'connect_error', 'failed', {
          consumeLink: false,
        })
      }
      const customer = await getSessionCustomer()
      if (!customer) {
        return profileRedirect(
          request,
          locale,
          provider,
          'connect_error',
          'session_expired'
        )
      }
      if (customer.id !== link.customerId) {
        authLogger.info`OAuth link callback for ${provider} rejected: customer changed mid-flow`
        return profileRedirect(request, locale, provider, 'connect_error', 'failed')
      }
      if (callbackParams.error) {
        return profileRedirect(request, locale, provider, 'connect_error', 'failed')
      }

      try {
        await linkOAuthIdentity(provider, callbackParams)
        try {
          await updateCustomer({
            metadata: recordLinkedProvider(
              isRecord(customer.metadata) ? customer.metadata : {},
              provider
            ),
          })
        } catch (error) {
          authLogger.error`Failed to sync linked OAuth provider: ${error}`
        }
        return profileRedirect(request, locale, provider, 'connect', provider)
      } catch (error) {
        const errorCode =
          error instanceof AuthMethodError &&
          (error.code === 'identity_linked_elsewhere' ||
            error.code === 'provider_already_connected')
            ? error.code
            : error instanceof AccountSecurityHoldError
              ? 'account_security_hold'
              : 'failed'
        return profileRedirect(request, locale, provider, 'connect_error', errorCode)
      }
    }

    if (callbackParams.error) {
      providerErrorCallback = true
      throw new Error('oauth_provider_error')
    }
    // establishOAuthSession owns the link-then-refresh-then-persist ordering
    // and writes the session cookie; the route only drives profile sync and
    // the redirect. Profile sync runs after the session exists (it reads the
    // session identity via getSessionCustomer) and is best-effort — it must
    // not block sign-in.
    const { payload } = locale === 'en'
      ? await establishOAuthSession(provider, callbackParams)
      : await establishOAuthSession(provider, callbackParams, { locale })
    await syncOauthProfile(provider, payload.user_metadata, locale)

    // Serve the account's saved language: when it differs from the sign-in
    // surface, redirect to the saved-locale path and seed the locale cookie so
    // the durable preference wins over the surface/Accept-Language. Best-effort:
    // never let a locale lookup turn a successful sign-in into an error.
    const savedLocale = await savedCustomerLocale().catch((error) => {
      authLogger.error`Failed to resolve saved locale after sign-in: ${error}`
      return null
    })
    if (savedLocale) {
      const barePath = sanitizeRedirectPath(redirectTo, {
        stripLocalePrefix: true,
      }) as `/${string}`
      const response = clearRedirectCookie(
        NextResponse.redirect(
          new URL(rootFallbackHref(savedLocale, barePath), request.url)
        ),
        provider
      )
      setLocaleCookieOnResponse(response, savedLocale)
      return response
    }

    return clearRedirectCookie(
      NextResponse.redirect(new URL(redirectTo, request.url)),
      provider
    )
  } catch (error) {
    const held = error instanceof AccountSecurityHoldError
    const errorCode = held
      ? error.errorCode
      : error instanceof Error && isOAuthErrorCode(error.message)
        ? error.message
        : 'oauth_failed'
    if (held) {
      authLogger.info`OAuth sign-in rejected: ${error.message}`
    } else if (providerErrorCallback) {
      authLogger.info`OAuth sign-in rejected: ${errorCode}`
    } else {
      authLogger.error`OAuth callback failed: ${error}`
    }
    const redirectTo = sanitizeRedirectPath(
      request.cookies.get(OAUTH_REDIRECT_COOKIE)?.value ??
        request.nextUrl.searchParams.get('redirect'),
      { stripLocalePrefix: false }
    )
    const loginUrl = new URL(
      loginPathForLocale(localeFromPath(redirectTo)),
      request.url
    )
    loginUrl.searchParams.set('error', errorCode)
    return clearRedirectCookie(NextResponse.redirect(loginUrl, 303), provider)
  }
}
