import { NextResponse } from 'next/server'
import { decodeState, isAcceptableCallback } from '@/lib/square-connect/state'
import { env } from '@/utils/env'

/**
 * Receive Square's authorization response and forward it to the merchant site.
 *
 * GET /api/square/callback?code=…&state=…
 *
 * This is the single redirect URL registered for the WCPOS Square application.
 * It forwards to whichever site started the flow, identified by the signed
 * state. No token is ever issued to or held by this service: the PKCE code
 * verifier stays on the merchant's site, so the code forwarded here cannot be
 * exchanged by this service or by anyone who observes it in transit.
 */
export async function GET(request: Request) {
  const secret = env.SQUARE_CONNECT_STATE_SECRET
  if (!secret) {
    return NextResponse.json({ errorCode: 'square_connect_not_configured' }, { status: 503 })
  }

  const url = new URL(request.url)
  const state = url.searchParams.get('state') ?? ''
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  const decoded = decodeState(state, secret, Date.now())

  // An unverifiable state gives us nowhere trustworthy to send the response, so
  // it terminates here rather than being forwarded anywhere.
  if (!decoded || !isAcceptableCallback(decoded.callbackUrl)) {
    return NextResponse.json({ errorCode: 'invalid_state' }, { status: 400 })
  }

  const destination = new URL(decoded.callbackUrl)
  destination.searchParams.set('state', state)

  if (code) {
    destination.searchParams.set('code', code)
  } else {
    // A declined authorization is forwarded too, so the site can report it
    // rather than leaving the administrator on a dead end.
    destination.searchParams.set('error', error ?? 'access_denied')
  }

  return NextResponse.redirect(destination.toString(), 302)
}
