import { NextResponse } from 'next/server'
import { EmailChangeRejected, requestEmailChange } from '@/lib/medusa-auth'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import { isUndeliverableVerdict, verifyEmailDomain } from '@/lib/email-domain'

/**
 * Start an email change for the signed-in customer.
 *
 * The confirmation goes to the NEW address, which is what makes this usable
 * by someone whose current address bounces. Nothing changes until that link
 * is followed, so this endpoint only ever sends mail.
 */
type EmailChangeErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'read_only_inspection'
  | 'unauthorized'
  | 'email_required'
  | 'password_required'
  | 'invalid_password'
  | 'email_taken'
  | 'email_undeliverable'
  | 'same_email'
  | 'change_failed'

function errorResponse(errorCode: EmailChangeErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

/** Backend reason -> what the customer is told. */
const BACKEND_CODES: Record<string, EmailChangeErrorCode> = {
  unauthorized: 'unauthorized',
  email_required: 'email_required',
  password_required: 'password_required',
  invalid_password: 'invalid_password',
  email_taken: 'email_taken',
  undeliverable_domain: 'email_undeliverable',
  invalid_email: 'email_undeliverable',
  same_email: 'same_email',
}

// Every accepted request fans out to a real email; gate like the password route.
const limiter = createRateLimiter({
  prefix: 'account:email:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse('invalid_origin', 403)
  }

  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  const rate = await limiter.consume(clientIp(request))
  if (rate.status === 'limited') {
    return errorResponse('rate_limited', 429)
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown
    password?: unknown
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email) {
    return errorResponse('email_required', 400)
  }

  // Check the domain here as well as in the backend: this is where the
  // friendly, localized message lives, and it saves a round trip for the
  // typo case the whole feature exists to catch.
  const verdict = await verifyEmailDomain(email)
  if (isUndeliverableVerdict(verdict)) {
    authLogger.info`Email change rejected: undeliverable domain. verdict=${verdict}`
    return errorResponse('email_undeliverable', 400)
  }

  try {
    await requestEmailChange({ email, ...(password ? { password } : {}) })
  } catch (error) {
    if (error instanceof EmailChangeRejected) {
      authLogger.info`Email change rejected by backend: ${error.errorCode}`
      const mapped = BACKEND_CODES[error.errorCode]
      return errorResponse(mapped ?? 'change_failed', mapped ? error.status : 400)
    }
    authLogger.error`Email change failed unexpectedly: ${error}`
    return errorResponse('change_failed', 500)
  }

  return NextResponse.json({ sent: true }, { status: 202 })
}
