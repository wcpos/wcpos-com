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

function isFormPost(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') ?? ''
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  )
}

/**
 * Form-encoded posts are CSRF-able "simple requests" (unlike JSON, which the
 * preflight already fences), so the browser-visible claim entry point checks
 * the request came from this site before starting an OAuth round-trip.
 */
function isCrossSiteFormPost(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  return new URL(origin).host !== request.nextUrl.host
}

export async function POST(request: NextRequest) {
  let body: { licenseKey?: unknown; returnTo?: unknown }
  if (isFormPost(request)) {
    // The licences page submits a real HTML form so the 303 → Discord →
    // callback chain runs as a top-level navigation.
    if (isCrossSiteFormPost(request)) {
      return NextResponse.json({ errorCode: 'cross_site_request' }, { status: 403 })
    }
    const form = await request.formData().catch((error: unknown) => {
      apiLogger.info`Discord claim received a malformed form body: ${error}`
      return new FormData()
    })
    body = { licenseKey: form.get('licenseKey'), returnTo: form.get('returnTo') }
  } else {
    // A malformed body is client-caused (it falls through to the 400 below), so
    // log at info rather than swallowing it silently.
    body = await request.json().catch((error: unknown) => {
      apiLogger.info`Discord claim received a malformed JSON body: ${error}`
      return {}
    }) as { licenseKey?: unknown; returnTo?: unknown }
  }
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
