import { NextResponse } from 'next/server'
import { getCustomer, requestPasswordReset } from '@/lib/medusa-auth'
import {
  AuthMethodError,
  ensureEmailpassAuthMethod,
} from '@/lib/auth-methods'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

/**
 * Send the signed-in customer a set/change-password email.
 *
 * First idempotently ensures an emailpass identity exists (an OAuth-only
 * account has none, and Medusa's reset flow silently sends nothing without
 * one), then requests the reset email with the identity's EXACT identifier —
 * stored emails are verbatim and reset-token lookup is exact-match.
 */
type PasswordErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'read_only_inspection'
  | 'unauthorized'
  | 'email_identity_reserved'
  | 'password_email_failed'

function errorResponse(errorCode: PasswordErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

// Every accepted request fans out to a real email; gate like forgot-password.
const limiter = createRateLimiter({
  prefix: 'account:password:ip',
  limit: 5,
  window: '15 m',
})

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse('invalid_origin', 403)
  }

  const { success } = await limiter.consume(clientIp(request))
  if (!success) {
    return errorResponse('rate_limited', 429)
  }

  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  const customer = await getCustomer()
  if (!customer) {
    return errorResponse('unauthorized', 401)
  }

  try {
    // null = backend without the endpoint yet; fall back to a plain reset
    // request (works for customers who already have an emailpass identity).
    const ensured = await ensureEmailpassAuthMethod()
    const identifier = ensured?.emailpassIdentifier ?? customer.email

    await requestPasswordReset(identifier)

    return NextResponse.json({
      sent: true,
      created: ensured?.created ?? false,
      // Where the email went — the card shows this in its "link sent" state.
      // The customer's own address, on an authed same-origin response.
      sentTo: identifier,
      ...(ensured
        ? {
            providers: ensured.providers,
            providerDetails: ensured.providerDetails,
            emailpassPending: ensured.emailpassPending,
            emailpassUpdatedAt: ensured.emailpassUpdatedAt,
            emailpassReserved: ensured.emailpassReserved,
          }
        : {}),
    })
  } catch (error) {
    if (
      error instanceof AuthMethodError &&
      error.code === 'email_identity_reserved'
    ) {
      return errorResponse('email_identity_reserved', 409)
    }
    authLogger.error`Password setup email failed (POST /api/account/password): ${error}`
    return errorResponse('password_email_failed', 500)
  }
}
