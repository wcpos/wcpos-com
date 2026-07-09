import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'
import {
  AuthMethodError,
  disconnectCustomerAuthMethod,
} from '@/lib/auth-methods'
import { removeAuthProviderFromMetadata } from '@/lib/auth-providers/metadata'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import { apiLogger } from '@/lib/logger'
import { isSameOriginRequest } from '@/lib/api/same-origin'

/**
 * Disconnect an OAuth sign-in provider from the account.
 *
 * The Medusa backend owns the guards (never the last sign-in method); this
 * route additionally scrubs the provider from the customer's attribution
 * metadata so the profile stops displaying it. Only google/github are
 * managed here — Discord is per-licence (ADR-0007), not a profile connection.
 */
const DISCONNECTABLE = new Set(['google', 'github'])

type DisconnectErrorCode =
  | 'invalid_origin'
  | 'read_only_inspection'
  | 'unauthorized'
  | 'unknown_provider'
  | 'provider_not_connected'
  | 'last_sign_in_method'
  | 'disconnect_failed'

function errorResponse(errorCode: DisconnectErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
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

  const { provider } = await params
  if (!DISCONNECTABLE.has(provider)) {
    return errorResponse('unknown_provider', 400)
  }

  const customer = await getCustomer()
  if (!customer) {
    return errorResponse('unauthorized', 401)
  }

  try {
    const methods = await disconnectCustomerAuthMethod(provider)

    // Scrub attribution metadata so the sign-in row stops naming the
    // provider. Best-effort: identity deletion already succeeded, and stale
    // attribution is display-only.
    try {
      await updateCustomer({
        metadata: removeAuthProviderFromMetadata(customer.metadata, provider),
      })
    } catch (error) {
      apiLogger.warn`Disconnected ${provider} but metadata scrub failed: ${error}`
    }

    // The full re-summarized methods, so the card re-renders every row
    // (identity details included) from one response.
    return NextResponse.json({
      providers: methods.providers,
      providerDetails: methods.providerDetails,
      emailpassPending: methods.emailpassPending,
      emailpassUpdatedAt: methods.emailpassUpdatedAt,
      emailpassReserved: methods.emailpassReserved,
    })
  } catch (error) {
    if (error instanceof AuthMethodError) {
      if (error.code === 'last_sign_in_method') {
        return errorResponse('last_sign_in_method', 409)
      }
      if (error.code === 'provider_not_connected') {
        return errorResponse('provider_not_connected', 404)
      }
    }
    apiLogger.error`Provider disconnect failed (DELETE /api/account/connections/${provider}): ${error}`
    return errorResponse('disconnect_failed', 500)
  }
}
