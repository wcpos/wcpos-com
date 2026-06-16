import { NextRequest, NextResponse } from 'next/server'
import { initiateOAuth } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'
import { isAllowedOAuthProvider } from '@/lib/oauth-providers'
import { sanitizeRedirectPath } from '@/lib/safe-redirect'
import { env } from '@/utils/env'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params

    if (!isAllowedOAuthProvider(provider, env.DISCORD_LOGIN_ENABLED === 'true')) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      )
    }

    const origin = request.nextUrl.origin
    const callbackUrl = new URL(`/api/auth/${provider}/callback`, origin)
    const redirectTo = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'))
    if (redirectTo !== '/account') {
      callbackUrl.searchParams.set('redirect', redirectTo)
    }

    const location = await initiateOAuth(provider, callbackUrl.toString())

    return NextResponse.redirect(location)
  } catch (error) {
    authLogger.error`Failed to initiate OAuth: ${error}`
    return NextResponse.redirect(
      new URL('/login?error=oauth_failed', request.url)
    )
  }
}
