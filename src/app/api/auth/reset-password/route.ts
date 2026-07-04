import { NextResponse } from 'next/server'
import { login, resetPassword, setAuthToken } from '@/lib/medusa-auth'
import { ApiError } from '@/lib/api/errors'
import { toErrorResponse } from '@/lib/api/to-error-response'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import {
  isPasswordTooShort,
  PASSWORD_TOO_SHORT_MESSAGE,
} from '@/lib/password-policy'

// Reset tokens are signed JWTs, so brute force is impractical — this limiter
// just caps abuse of an unauthenticated endpoint. Fail-open.
const limiter = createRateLimiter({
  prefix: 'auth:reset-password:ip',
  limit: 10,
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

  // Malformed JSON is client-caused: fall through to the 400 below.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    token?: unknown
    password?: unknown
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const token = typeof body.token === 'string' ? body.token : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !token || !password) {
    return NextResponse.json(
      { error: 'Email, token, and password are required' },
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
    await resetPassword({ email, token, password })
  } catch (error) {
    // Expired/used reset links are routine user behaviour (typed
    // InvalidResetTokenError -> 401) — keep them at info so they never fan
    // out to alerts.
    if (error instanceof ApiError) {
      authLogger.info`Password reset rejected: ${error.message}`
      return toErrorResponse(error)
    }
    authLogger.error`Password reset failed unexpectedly: ${error}`
    const message =
      error instanceof Error ? error.message : 'Failed to reset password'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // The password is already changed at this point — a sign-in hiccup must not
  // read as "reset failed", so it only downgrades the response to
  // signedIn: false and the client sends the user to /login instead.
  try {
    const sessionToken = await login(email, password)
    await setAuthToken(sessionToken)
    return NextResponse.json({ success: true, signedIn: true })
  } catch (error) {
    authLogger.error`Post-reset sign-in failed: ${error}`
    return NextResponse.json({ success: true, signedIn: false })
  }
}
