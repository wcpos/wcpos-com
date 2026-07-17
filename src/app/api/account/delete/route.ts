import { NextResponse } from 'next/server'
import { deleteCustomerAccount, getCustomer, logout } from '@/lib/medusa-auth'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import { authLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

/**
 * Delete the signed-in customer's account.
 *
 * The Medusa backend owns the actual erasure (auth identities, email
 * suppression, customer soft-delete with orders retained); this route gates
 * the request and clears the session cookie once the backend confirms. The
 * cookie is only cleared AFTER a successful delete — a failed attempt must
 * leave the customer signed in so the error is visible and retryable.
 *
 * The path MUST stay under `/api/account/` — the middleware stamps the
 * account-request header only for that prefix, and without it
 * `assertViewOnly()` passes vacuously and an impersonating admin's request
 * would resolve to (and delete!) their own account.
 *
 * The typed confirmation email travels in the body and is compared against
 * the freshly authenticated customer: if the session changed identity after
 * the dialog rendered (another tab, expired impersonation), the mismatch
 * 409s instead of deleting an account the user never confirmed.
 */
type DeleteAccountErrorCode =
  | 'invalid_origin'
  | 'rate_limited'
  | 'read_only_inspection'
  | 'unauthorized'
  | 'confirmation_mismatch'
  | 'account_deletion_failed'

function errorResponse(errorCode: DeleteAccountErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

// Destructive and never legitimately rapid-fire; gate hard.
const limiter = createRateLimiter({
  prefix: 'account:delete:ip',
  limit: 3,
  window: '15 m',
})

export async function DELETE(request: Request) {
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

  const body = (await request.json().catch(() => null)) as {
    email?: unknown
  } | null
  const confirmedEmail =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null
  if (confirmedEmail !== customer.email.trim().toLowerCase()) {
    return errorResponse('confirmation_mismatch', 409)
  }

  try {
    await deleteCustomerAccount()
  } catch (error) {
    authLogger.error`Account deletion failed (DELETE /api/account/delete) for customer ${customer.id}: ${error}`
    return errorResponse('account_deletion_failed', 502)
  }

  await logout()
  authLogger.info`Account deleted (DELETE /api/account/delete) for customer ${customer.id}`

  return NextResponse.json({ deleted: true })
}
