import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'
import { establishOAuthSession } from '@/lib/oauth'
import { authLogger } from '@/lib/logger'
import { getConnectedAvatarUrlFromUserMetadata } from '@/lib/avatar'
import { recordSignInProvider } from '@/lib/auth-providers/metadata'
import { ALLOWED_PROVIDERS } from '@/lib/oauth-providers'
import { sanitizeRedirectPath } from '@/lib/safe-redirect'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function syncOauthProfile(
  provider: string,
  userMetadata: Record<string, string>
) {
  try {
    const customer = await getCustomer()
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

    const redirectTo = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'))

    // Collect all query params from the OAuth provider (code, state, etc.)
    const callbackParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key === 'redirect') return
      callbackParams[key] = value
    })

    // establishOAuthSession owns the link-then-refresh-then-persist ordering
    // and writes the session cookie; the route only drives profile sync and
    // the redirect. Profile sync runs after the session exists (it reads the
    // cookie via getCustomer) and is best-effort — it must not block sign-in.
    const { payload } = await establishOAuthSession(provider, callbackParams)
    await syncOauthProfile(provider, payload.user_metadata)

    return NextResponse.redirect(new URL(redirectTo, request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    authLogger.error`OAuth callback failed: ${message}`
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(loginUrl, 303)
  }
}
