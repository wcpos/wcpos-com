import { NextRequest, NextResponse } from 'next/server'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

/**
 * Google OAuth Callback Handler
 * 
 * This route handles the OAuth callback from Google and integrates
 * with both wcpos-com and MedusaJS customer systems.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('[Google OAuth] Error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('OAuth authentication failed')}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Missing authorization code')}`, request.url)
    )
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_CALLBACK_URL || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Google')
    }

    const googleUser = await userResponse.json()

    // Handle OAuth login with unified service
    const result = await UnifiedCustomerService.handleOAuthLogin({
      email: googleUser.email,
      firstName: googleUser.given_name,
      lastName: googleUser.family_name,
      provider: 'google',
      providerId: googleUser.id,
    })

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(result.error || 'Login failed')}`, request.url)
      )
    }

    // Redirect to account page or intended destination
    const redirectTo = state ? decodeURIComponent(state) : '/account'
    return NextResponse.redirect(new URL(redirectTo, request.url))

  } catch (error) {
    console.error('[Google OAuth] Callback error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('OAuth authentication failed')}`, request.url)
    )
  }
}