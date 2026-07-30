import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

// Every accepted request fans out to a real email via the backend's
// password-reset subscriber, so gate this harder than sign-in. Fail-open.
type ForgotPasswordErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'email_required'
  | 'reset_request_failed'

function errorResponse(errorCode: ForgotPasswordErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

const limiter = createRateLimiter({
  prefix: 'auth:forgot-password:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    authLogger.info`Password reset request rejected: cross-origin request`
    return errorResponse('invalid_origin', 403)
  }

  const ip = clientIp(request)
  const { success } = await limiter.consume(ip)
  if (!success) {
    authLogger.info`Password reset request rejected: rate limited. ip=${ip}`
    return errorResponse('rate_limited', 429)
  }

  // Malformed JSON is client-caused: fall through to the 400 below.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!email) {
    return errorResponse('email_required', 400)
  }

  try {
    // Medusa itself never reveals whether the email has an account (201
    // either way), so success here carries no enumeration signal.
    await requestPasswordReset(email)
    return NextResponse.json({ success: true })
  } catch (error) {
    // Only Medusa being down / a 4xx-5xx lands here — unexpected, alert-worthy.
    authLogger.error`Password reset request failed unexpectedly: ${error}`
    return errorResponse('reset_request_failed', 500)
  }
}
