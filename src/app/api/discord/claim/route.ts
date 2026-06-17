import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { DiscordApiClient } from '@/lib/discord/client'
import { getDiscordConfig } from '@/lib/discord/config'
import { setDiscordOAuthState } from '@/lib/discord/oauth-state'

function redirectUri(request: NextRequest): string {
  return new URL('/api/discord/callback', request.url).toString()
}

function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/account/licenses'
  }
  try {
    const parsed = new URL(value, 'https://wcpos.local')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/account/licenses'
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { licenseKey?: unknown; returnTo?: unknown }
  const licenseKey = typeof body.licenseKey === 'string' ? body.licenseKey.trim() : ''
  if (!licenseKey) {
    return NextResponse.json({ error: 'license_key_required' }, { status: 400 })
  }

  const state = crypto.randomBytes(24).toString('base64url')
  const returnTo = safeReturnTo(body.returnTo)
  await setDiscordOAuthState({ state, licenseKey, returnTo })

  const client = new DiscordApiClient(getDiscordConfig())
  return NextResponse.redirect(
    client.buildAuthorizeUrl({ redirectUri: redirectUri(request), state }),
    { status: 303 }
  )
}
