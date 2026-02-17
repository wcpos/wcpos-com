import { NextRequest, NextResponse } from 'next/server'
import {
  completeOAuthCallback,
  setAuthToken,
  refreshToken,
  decodeMedusaToken,
  linkOrCreateCustomer,
  getCustomer,
  updateCustomer,
} from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'
import { getConnectedAvatarUrlFromUserMetadata } from '@/lib/avatar'

const ALLOWED_PROVIDERS = ['google', 'github']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function syncOauthAvatar(userMetadata: Record<string, string>) {
  const avatarUrl = getConnectedAvatarUrlFromUserMetadata(userMetadata)
  if (!avatarUrl) return

  try {
    const customer = await getCustomer()
    if (!customer) return

    const metadata = isRecord(customer.metadata) ? customer.metadata : {}
    if (metadata.oauth_avatar_url === avatarUrl) {
      return
    }

    await updateCustomer({
      metadata: {
        ...metadata,
        oauth_avatar_url: avatarUrl,
      },
    })
  } catch (error) {
    authLogger.error`Failed to sync OAuth avatar: ${error}`
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

    // Collect all query params from the OAuth provider (code, state, etc.)
    const callbackParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackParams[key] = value
    })

    const token = await completeOAuthCallback(provider, callbackParams)
    const payload = decodeMedusaToken(token)

    let sessionToken = token

    if (!payload.actor_id) {
      // No customer linked yet — link to existing or create new
      await linkOrCreateCustomer(token)
      const refreshedToken = await refreshToken(token)
      sessionToken = refreshedToken
      await setAuthToken(refreshedToken)
    } else {
      // Existing linked customer — just set the token
      await setAuthToken(token)
    }

    const sessionPayload = decodeMedusaToken(sessionToken)
    await syncOauthAvatar(sessionPayload.user_metadata)

    return NextResponse.redirect(new URL('/account', request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    authLogger.error`OAuth callback failed: ${message}`
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(loginUrl, 303)
  }
}
