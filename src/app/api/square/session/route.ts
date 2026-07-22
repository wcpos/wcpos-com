import { NextResponse } from 'next/server'
import {
  authorizeBaseUrl,
  encodeState,
  isAcceptableCallback,
  SQUARE_SCOPES,
  type SquareEnvironment,
} from '@/lib/square-connect/state'
import { env } from '@/utils/env'

/**
 * Start a Square authorization for a merchant site.
 *
 * POST /api/square/session
 * Body: { callback_url, code_challenge, environment }
 * Returns: { authorize_url, state }
 *
 * The merchant's site generates the PKCE verifier and sends only its challenge,
 * so this service cannot exchange the resulting authorization code. It exists
 * solely because Square permits one registered redirect URL per application.
 */
export async function POST(request: Request) {
  const secret = env.SQUARE_CONNECT_STATE_SECRET
  const clientIds = {
    production: env.SQUARE_CONNECT_CLIENT_ID,
    sandbox: env.SQUARE_CONNECT_SANDBOX_CLIENT_ID,
  }

  if (!secret || (!clientIds.production && !clientIds.sandbox)) {
    return NextResponse.json({ errorCode: 'square_connect_not_configured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ errorCode: 'invalid_body' }, { status: 400 })
  }

  const { callback_url: callbackUrl, code_challenge: codeChallenge, environment } = (body ??
    {}) as Record<string, unknown>

  if (typeof callbackUrl !== 'string' || !isAcceptableCallback(callbackUrl)) {
    return NextResponse.json({ errorCode: 'invalid_callback_url' }, { status: 400 })
  }

  // Square requires S256; a short or absent challenge means the caller is not
  // running PKCE, and without it the code this flow returns would be bearer-usable.
  if (typeof codeChallenge !== 'string' || !/^[A-Za-z0-9\-._~]{43,128}$/.test(codeChallenge)) {
    return NextResponse.json({ errorCode: 'invalid_code_challenge' }, { status: 400 })
  }

  if (environment !== 'sandbox' && environment !== 'production') {
    return NextResponse.json({ errorCode: 'invalid_environment' }, { status: 400 })
  }

  const clientId = clientIds[environment]
  if (!clientId) {
    return NextResponse.json({ errorCode: 'square_connect_not_configured' }, { status: 503 })
  }

  const state = encodeState(
    { callbackUrl, environment: environment as SquareEnvironment, issuedAt: Date.now() },
    secret
  )

  const authorizeUrl = new URL(authorizeBaseUrl(environment))
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('scope', SQUARE_SCOPES.join(' '))
  authorizeUrl.searchParams.set('session', 'false')
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('code_challenge', codeChallenge)

  return NextResponse.json({ authorize_url: authorizeUrl.toString(), state })
}
