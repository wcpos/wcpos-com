import { NextRequest, NextResponse } from 'next/server'
import { initiateOAuth } from '@/lib/medusa-auth'
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

    const origin = request.nextUrl.origin
    const callbackUrl = `${origin}/api/auth/${provider}/callback`
    const location = await initiateOAuth(provider, callbackUrl)

    return NextResponse.redirect(location)
  } catch (error) {
    authLogger.error`Failed to initiate OAuth: ${error}`
    return NextResponse.redirect(
      new URL('/login?error=oauth_failed', request.url)
    )
  }
}
