import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { apiLogger } from '@/lib/logger'
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
  // A malformed body is client-caused (it falls through to the 400 below), so
  // log at info rather than swallowing it silently.
  const body = await request.json().catch((error: unknown) => {
    apiLogger.info`Discord claim received a malformed JSON body: ${error}`
    return {}
  }) as { licenseKey?: unknown; returnTo?: unknown }
  const licenseKey = typeof body.licenseKey === 'string' ? body.licenseKey.trim() : ''
  if (!licenseKey) {
    return NextResponse.json({ errorCode: 'license_key_required' }, { status: 400 })
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
