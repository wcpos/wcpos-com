import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { register, setAuthToken } from '@/lib/medusa-auth'
import { ApiError } from '@/lib/api/errors'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import {
  isPasswordTooShort,
} from '@/lib/password-policy'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import { isLoopbackHost } from '@/lib/request-host'
import { verifyTurnstile } from '@/lib/support/turnstile'
import { trackServerEvent } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import {
  parseCheckoutLocale,
  parsePostHogSessionId,
} from '@/lib/analytics/checkout-attribution'

// Every accepted request can create a real Medusa customer account, so gate
// this harder than sign-in — a legitimate user registers once.
type RegisterErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'rate_limit_unavailable'
  | 'bot_check_failed'
  | 'credentials_required'
  | 'password_too_short'
  | 'account_exists'
  | 'registration_failed'

function errorResponse(errorCode: RegisterErrorCode, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ errorCode, ...extra }, { status })
}


const limiter = createRateLimiter({
  prefix: 'auth:register:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse('invalid_origin', 403)
  }

  const ip = clientIp(request)
  const rate = await limiter.consume(ip)
  if (
    rate.status === 'unavailable' &&
    !isLoopbackHost(request.headers.get('host'))
  ) {
    return errorResponse('rate_limit_unavailable', 503)
  }
  if (rate.status === 'limited') {
    return errorResponse('rate_limited', 429)
  }

  // Malformed JSON is client-caused: fall through to the 400 below instead of
  // treating it as a registration failure.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
    locale?: unknown
    sessionId?: unknown
    turnstileToken?: unknown
  }
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName : undefined
  const lastName = typeof body.lastName === 'string' ? body.lastName : undefined
  const locale = parseCheckoutLocale(body.locale)
  const sessionId = parsePostHogSessionId(body.sessionId)
  const turnstileToken =
    typeof body.turnstileToken === 'string' ? body.turnstileToken : ''

  if (!email || !password) {
    return errorResponse('credentials_required', 400)
  }

  if (isPasswordTooShort(password)) {
    return errorResponse('password_too_short', 400)
  }

  const turnstileVerified = await verifyTurnstile(
    turnstileToken,
    request.headers.get('host'),
    ip
  ).catch(() => false)
  if (!turnstileVerified) {
    return errorResponse('bot_check_failed', 403)
  }

  try {
    const { token, customer } = await register({
      email,
      password,
      firstName,
      lastName,
      locale,
    })
    await setAuthToken(token)

    // Top-of-funnel conversion: a visitor just became a (free) account holder.
    // Fire-and-forget, mirroring checkout_completed — trackServerEvent gates on
    // request consent and self-registers delivery, so the response is never
    // blocked and the event survives the post-response freeze. Prefer the
    // landing-page anon id so it stitches onto the same person as their visit;
    // fall back to the unique customer.id (never a shared placeholder, which
    // would merge unrelated signups into one PostHog person and break counts).
    try {
      const cookieStore = await cookies()
      const distinctId = cookieStore.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
      void trackServerEvent('signup_completed', {
        method: 'email',
        customer_id: customer.id,
        distinct_id: distinctId ?? customer.id,
        funnel_step: 'signup_completed',
        page: '/register',
        ...(sessionId ? { $session_id: sessionId } : {}),
        ...(locale ? { locale } : {}),
      }).catch((trackingError) => {
        authLogger.warn`Signup tracking failed: ${trackingError}`
      })
    } catch (trackingError) {
      authLogger.warn`Signup tracking failed: ${trackingError}`
    }

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    // Typed domain errors (AccountExistsError -> 409 ACCOUNT_EXISTS) carry their
    // own status/code via the adapter. They are routine user-caused rejections,
    // so log at info — error level fans out to alerts.
    if (error instanceof ApiError) {
      authLogger.info`Registration rejected: ${error.message}`
      if (error.code === 'ACCOUNT_EXISTS') {
        return errorResponse('account_exists', error.status, { code: error.code })
      }
      return errorResponse('registration_failed', error.status)
    }
    // Everything else is an unclassified registration failure surfaced as a
    // 400 with its message (unchanged) — but unexpected, so log at error.
    authLogger.error`Registration failed unexpectedly: ${error}`
    return errorResponse('registration_failed', 400)
  }
}
