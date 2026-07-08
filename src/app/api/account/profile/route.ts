import { NextRequest, NextResponse } from 'next/server'
import {
  getCustomer,
  updateCustomer,
  upsertDefaultBillingAddress,
  type UpdateCustomerInput,
} from '@/lib/medusa-auth'
import { apiLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import {
  mergeAccountProfileMetadataPatch,
  projectProfileMetadataForClient,
  type AccountProfilePatchInput,
} from '@/lib/customer-profile-metadata'
import {
  billingDetailsFromCustomer,
  billingPatchFromProfileForm,
} from '@/lib/billing-profile'

// `email` is intentionally not read from the body: it is not editable on this
// endpoint, and Medusa's store update-customer schema rejects unknown fields
// (forwarding it 400s with "Unrecognized fields: 'email'").
interface ProfilePayload {
  first_name?: string
  last_name?: string
  phone?: string
  /** Avatar-only metadata patch (account_profile). */
  avatar?: AccountProfilePatchInput
  /** Billing details — written to the default billing customer address. */
  billingAddress?: unknown
  /**
   * Legacy payload from pre-refactor client bundles: avatar AND billing
   * fields in one object. Field names are compatible with both new halves,
   * so a stale tab's save keeps working instead of silently no-opping.
   */
  accountProfile?: AccountProfilePatchInput
}

type ProfileErrorCode =
  | 'read_only_inspection'
  | 'unauthorized'
  | 'update_failed'

function errorResponse(errorCode: ProfileErrorCode, status: number): NextResponse {
  return NextResponse.json({ errorCode }, { status })
}

function normalizeField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim()
}

export async function PATCH(request: NextRequest) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  const currentCustomer = await getCustomer()
  if (!currentCustomer) {
    return errorResponse('unauthorized', 401)
  }

  try {
    const body = (await request.json()) as ProfilePayload

    const payload: UpdateCustomerInput = {
      first_name: normalizeField(body.first_name),
      last_name: normalizeField(body.last_name),
      phone: normalizeField(body.phone),
    }

    const metadata = mergeAccountProfileMetadataPatch(
      currentCustomer.metadata,
      body.avatar ?? body.accountProfile
    )
    if (metadata) {
      payload.metadata = metadata
    }

    // A billing-only PATCH has nothing customer-level to write; skip the
    // no-op round trip.
    const hasCustomerChanges =
      payload.metadata !== undefined ||
      payload.first_name !== undefined ||
      payload.last_name !== undefined ||
      payload.phone !== undefined

    let updatedCustomer = currentCustomer
    if (hasCustomerChanges) {
      const updated = await updateCustomer(payload)
      if (!updated) {
        return errorResponse('unauthorized', 401)
      }
      updatedCustomer = updated
    }

    // Billing details live on the default billing address (the single source
    // of truth receipts and checkout share), not in customer metadata.
    const billingPatch = billingPatchFromProfileForm(
      body.billingAddress ?? body.accountProfile
    )
    if (billingPatch) {
      const upserted = await upsertDefaultBillingAddress(
        updatedCustomer,
        billingPatch
      )
      if (!upserted) {
        // A null upsert is a failed write, not a fallback — reporting
        // success here would silently revert the user's billing edits.
        return errorResponse('unauthorized', 401)
      }
      updatedCustomer = upserted
    }

    return NextResponse.json({
      customer: {
        ...updatedCustomer,
        metadata: projectProfileMetadataForClient(updatedCustomer.metadata),
      },
      billingDetails: billingDetailsFromCustomer(updatedCustomer),
    }, { status: 200 })
  } catch (error) {
    apiLogger.error`Profile update failed (PATCH /api/account/profile): ${error}`

    return errorResponse('update_failed', 400)
  }
}
