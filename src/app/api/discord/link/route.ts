import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getCustomer } from '@/lib/medusa-auth'
import { DiscordApiClient } from '@/lib/discord/client'
import { getDiscordConfig } from '@/lib/discord/config'
import { setDiscordOAuthState } from '@/lib/discord/oauth-state'

function redirectUri(request: NextRequest): string {
  return new URL('/api/discord/callback', request.url).toString()
}

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account'
  try {
    const parsed = new URL(value, 'https://wcpos.local')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/account'
  }
}

export async function GET(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const state = crypto.randomBytes(24).toString('base64url')
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get('return_to'))
  await setDiscordOAuthState({ state, customerId: customer.id, returnTo })

  const client = new DiscordApiClient(getDiscordConfig())
  return NextResponse.redirect(
    client.buildAuthorizeUrl({ redirectUri: redirectUri(request), state })
  )
}
