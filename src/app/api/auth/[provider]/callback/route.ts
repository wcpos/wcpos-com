import { NextRequest, NextResponse } from 'next/server'
import {
  completeOAuthCallback,
  setAuthToken,
  refreshToken,
  decodeMedusaToken,
  linkOrCreateCustomer,
} from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'

const ALLOWED_PROVIDERS = ['google', 'github']

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

    if (!payload.actor_id) {
      // No customer linked yet — link to existing or create new
      await linkOrCreateCustomer(token)
      const refreshedToken = await refreshToken(token)
      await setAuthToken(refreshedToken)
    } else {
      // Existing linked customer — just set the token
      await setAuthToken(token)
    }

    return NextResponse.redirect(new URL('/account', request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    authLogger.error`OAuth callback failed: ${message}`
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(loginUrl, 303)
  }
}
