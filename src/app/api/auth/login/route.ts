import { NextResponse } from 'next/server'
import {
  assertCustomerAccess,
  login,
  setAuthToken,
} from '@/lib/medusa-auth'
import { savedCustomerLocale, writeLocaleCookie } from '@/lib/account-locale'
import {
  AccountSecurityHoldError,
  InvalidCredentialsError,
} from '@/lib/api/errors'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

// Login is the natural credential-stuffing target: generous enough for a
// fumbled password, tight enough to blunt automated guessing. Fail-open.
type LoginErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'credentials_required'
  | 'invalid_credentials'
  | 'account_security_hold'
  | 'login_failed'

function errorResponse(errorCode: LoginErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

const limiter = createRateLimiter({
  prefix: 'auth:login:ip',
  limit: 10,
  window: '5 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse('invalid_origin', 403)
  }

  const { success } = await limiter.consume(clientIp(request))
  if (!success) {
    return errorResponse('rate_limited', 429)
  }

  // Malformed JSON is client-caused: fall through to the 400 below instead of
  // treating it as a login failure.
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
  }
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return errorResponse('credentials_required', 400)
  }

  try {
    const token = await login(email, password)
    await assertCustomerAccess(token)
    await setAuthToken(token)

    // Serve the account's saved language on the next request by seeding the
    // locale cookie the middleware reads — so a returning user's preference
    // wins over the browser's Accept-Language on a fresh browser. Best-effort:
    // a locale lookup hiccup must never fail an otherwise-successful sign-in.
    try {
      const savedLocale = await savedCustomerLocale()
      if (savedLocale) {
        await writeLocaleCookie(savedLocale)
      }
    } catch (error) {
      authLogger.error`Failed to apply saved locale on login: ${error}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Login failed'
    // Wrong email/password is routine user behaviour — keep it at info so it
    // never fans out to alerts. Anything else (Medusa down, 5xx, cookie
    // failure) is unexpected and logged at error.
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof AccountSecurityHoldError
    ) {
      authLogger.info`Login rejected: ${message}`
    } else {
      authLogger.error`Login failed unexpectedly: ${error}`
    }
    if (error instanceof AccountSecurityHoldError) {
      return errorResponse('account_security_hold', error.status)
    }
    return errorResponse(
      error instanceof InvalidCredentialsError
        ? 'invalid_credentials'
        : 'login_failed',
      401
    )
  }
}
