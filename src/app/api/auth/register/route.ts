import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { register, setAuthToken } from '@/lib/medusa-auth'
import { ApiError } from '@/lib/api/errors'
import { toErrorResponse } from '@/lib/api/to-error-response'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import {
  isPasswordTooShort,
  PASSWORD_TOO_SHORT_MESSAGE,
} from '@/lib/password-policy'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import { trackServerEvent } from '@/services/core/analytics/posthog-service'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'

// Every accepted request can create a real Medusa customer account, so gate
// this harder than sign-in — a legitimate user registers once. Fail-open.
const limiter = createRateLimiter({
  prefix: 'auth:register:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { success } = await limiter.consume(clientIp(request))
  if (!success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Malformed JSON is client-caused: fall through to the 400 below instead of
  // treating it as a registration failure.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
    firstName?: unknown
    lastName?: unknown
  }
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName : undefined
  const lastName = typeof body.lastName === 'string' ? body.lastName : undefined

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  if (isPasswordTooShort(password)) {
    return NextResponse.json(
      { error: PASSWORD_TOO_SHORT_MESSAGE },
      { status: 400 }
    )
  }

  try {
    const { token, customer } = await register({
      email,
      password,
      firstName,
      lastName,
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
      return toErrorResponse(error)
    }
    // Everything else is an unclassified registration failure surfaced as a
    // 400 with its message (unchanged) — but unexpected, so log at error.
    authLogger.error`Registration failed unexpectedly: ${error}`
    const message =
      error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
