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
  billingDetailsFromAddress,
  billingPatchFromProfileForm,
  pickDefaultBillingAddress,
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
      body.avatar
    )
    if (metadata) {
      payload.metadata = metadata
    }

    let updatedCustomer = await updateCustomer(payload)

    if (!updatedCustomer) {
      return errorResponse('unauthorized', 401)
    }

    // Billing details live on the default billing address (the single source
    // of truth receipts and checkout share), not in customer metadata.
    const billingPatch = billingPatchFromProfileForm(body.billingAddress)
    if (billingPatch) {
      updatedCustomer =
        (await upsertDefaultBillingAddress(billingPatch)) ?? updatedCustomer
    }

    return NextResponse.json({
      customer: {
        ...updatedCustomer,
        metadata: projectProfileMetadataForClient(updatedCustomer.metadata),
      },
      billingDetails: billingDetailsFromAddress(
        pickDefaultBillingAddress(updatedCustomer.addresses)
      ),
    }, { status: 200 })
  } catch (error) {
    apiLogger.error`Profile update failed (PATCH /api/account/profile): ${error}`

    return errorResponse('update_failed', 400)
  }
}
