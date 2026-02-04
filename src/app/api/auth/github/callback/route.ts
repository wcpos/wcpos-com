import { NextRequest, NextResponse } from 'next/server'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

/**
 * GitHub OAuth Callback Handler
 * 
 * This route handles the OAuth callback from GitHub and integrates
 * with both wcpos-com and MedusaJS customer systems.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('[GitHub OAuth] Error:', error)
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
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token')
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'WCPOS-App',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from GitHub')
    }

    const githubUser = await userResponse.json()

    // Get user's primary email if not public
    let email = githubUser.email
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'WCPOS-App',
        },
      })

      if (emailResponse.ok) {
        const emails = await emailResponse.json()
        const primaryEmail = emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified)
        email = primaryEmail?.email || emails[0]?.email
      }
    }

    if (!email) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('No email address found in GitHub account')}`, request.url)
      )
    }

    // Handle OAuth login with unified service
    const result = await UnifiedCustomerService.handleOAuthLogin({
      email,
      firstName: githubUser.name?.split(' ')[0] || githubUser.login,
      lastName: githubUser.name?.split(' ').slice(1).join(' ') || '',
      provider: 'github',
      providerId: githubUser.id.toString(),
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
    console.error('[GitHub OAuth] Callback error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('OAuth authentication failed')}`, request.url)
    )
  }
}