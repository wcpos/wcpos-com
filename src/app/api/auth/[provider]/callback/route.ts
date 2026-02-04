import { NextRequest, NextResponse } from 'next/server'
import {
  completeOAuthCallback,
  setAuthToken,
  refreshToken,
} from '@/lib/medusa-auth'
import { env } from '@/utils/env'

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

    // Decode the JWT payload to check for actor_id
    const base64Payload = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const payload = JSON.parse(atob(base64Payload))

    if (!payload.actor_id) {
      // New user: create a customer record, then refresh the token
      const customerResponse = await fetch(
        `${env.MEDUSA_BACKEND_URL}/store/customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-publishable-api-key': env.MEDUSA_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify({}),
        }
      )

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text()
        let message = 'Failed to create customer'
        try {
          const parsed = JSON.parse(errorText)
          message = parsed.message || message
        } catch {
          // use default message
        }
        throw new Error(message)
      }

      const refreshedToken = await refreshToken(token)
      await setAuthToken(refreshedToken)
    } else {
      // Existing user: just set the token
      await setAuthToken(token)
    }

    return NextResponse.redirect(new URL('/account', request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[OAuth] Callback failed:', message)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'oauth_failed')
    loginUrl.searchParams.set('detail', message)
    return NextResponse.redirect(loginUrl, 303)
  }
}
