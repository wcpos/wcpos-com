import { NextResponse } from 'next/server'
import { EmailChangeRejected, confirmEmailChange } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

/**
 * Complete an email change.
 *
 * Deliberately does NOT require a session. The link arrives by email and is
 * routinely opened on a different device from the one that started the
 * change; the signed, short-lived, single-use token is the authorisation.
 *
 * Note the session that IS present here is now stale — its identity is the
 * old address — so the client must fully reload after this succeeds rather
 * than trusting the cached router state.
 */
type ConfirmErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'token_required'
  | 'invalid_token'
  | 'expired_token'
  | 'change_failed'

function errorResponse(errorCode: ConfirmErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

const BACKEND_CODES: Record<string, ConfirmErrorCode> = {
  invalid_token: 'invalid_token',
  expired_token: 'expired_token',
  change_failed: 'change_failed',
}

// Token guessing is infeasible against an HMAC, but an unauthenticated
// endpoint that does real writes still gets a gate.
const limiter = createRateLimiter({
  prefix: 'account:email-confirm:ip',
  limit: 10,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse('invalid_origin', 403)
  }

  const rate = await limiter.consume(clientIp(request))
  if (rate.status === 'limited') {
    return errorResponse('rate_limited', 429)
  }
  if (rate.status !== 'allowed') {
    // Deliberately fails OPEN, unlike the request route. There, an accepted
    // request sends mail to a caller-chosen address, so an outage must not
    // remove the gate. Here the security control is the HMAC token itself —
    // without a valid one this endpoint does nothing but return 400, and the
    // limiter is only anti-noise. Failing closed would turn a limiter blip
    // into "nobody can complete an email change", stranding the very
    // customers whose old address already bounces.
    authLogger.warn`Email change confirm proceeding without rate limiting: limiter store unreachable`
  }

  const body = (await request.json().catch(() => ({}))) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) {
    return errorResponse('token_required', 400)
  }

  try {
    const email = await confirmEmailChange(token)
    authLogger.info`Email change confirmed`
    return NextResponse.json({ email }, { status: 200 })
  } catch (error) {
    if (error instanceof EmailChangeRejected) {
      authLogger.info`Email change confirm rejected: ${error.errorCode}`
      const mapped = BACKEND_CODES[error.errorCode] ?? 'invalid_token'
      return errorResponse(mapped, error.status === 409 ? 409 : 400)
    }
    authLogger.error`Email change confirm failed unexpectedly: ${error}`
    return errorResponse('change_failed', 500)
  }
}
