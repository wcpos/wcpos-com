import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { apiLogger } from '@/lib/logger'
import { DiscordApiClient } from '@/lib/discord/client'
import { getDiscordConfig } from '@/lib/discord/config'
import { setDiscordOAuthState } from '@/lib/discord/oauth-state'
import { supportedBaseLocaleOrDefault } from '@/lib/locale-preferences'
import { localizeRedirectPath, sanitizeRedirectPath } from '@/lib/safe-redirect'

function redirectUri(request: NextRequest): string {
  return new URL('/api/discord/callback', request.url).toString()
}

function fallbackReturnTo(request: NextRequest): string {
  const locale = supportedBaseLocaleOrDefault(
    request.cookies.get('NEXT_LOCALE')?.value ||
      request.headers.get('accept-language')
  )
  return localizeRedirectPath('/account/licenses', locale)
}

function safeReturnTo(value: unknown, request: NextRequest): string {
  const fallback = fallbackReturnTo(request)
  return typeof value === 'string'
    ? sanitizeRedirectPath(value, { fallback, stripLocalePrefix: false })
    : fallback
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
  const returnTo = safeReturnTo(body.returnTo, request)
  await setDiscordOAuthState({ state, licenseKey, returnTo })

  const client = new DiscordApiClient(getDiscordConfig())
  return NextResponse.redirect(
    client.buildAuthorizeUrl({ redirectUri: redirectUri(request), state }),
    { status: 303 }
  )
}
