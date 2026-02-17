import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'

interface ProfilePayload {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, unknown>
  accountProfile?: {
    avatarDataUrl?: string | null
    avatarUrl?: string | null
    countryCode?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    taxNumber?: string | null
  }
}

function normalizeField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim()
}

function normalizeProfileField(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function buildAccountProfileMetadata(
  value: ProfilePayload['accountProfile']
): Record<string, string | null> | null {
  if (!isRecord(value)) return null

  const normalized: Record<string, string | null> = {}
  const avatarDataUrl = normalizeProfileField(value.avatarDataUrl)
  const avatarUrl = normalizeProfileField(value.avatarUrl)
  const countryCode = normalizeProfileField(value.countryCode)
  const addressLine1 = normalizeProfileField(value.addressLine1)
  const addressLine2 = normalizeProfileField(value.addressLine2)
  const city = normalizeProfileField(value.city)
  const region = normalizeProfileField(value.region)
  const postalCode = normalizeProfileField(value.postalCode)
  const taxNumber = normalizeProfileField(value.taxNumber)

  if (avatarDataUrl !== undefined) normalized.avatarDataUrl = avatarDataUrl
  if (avatarUrl !== undefined) normalized.avatarUrl = avatarUrl
  if (countryCode !== undefined) normalized.countryCode = countryCode
  if (addressLine1 !== undefined) normalized.addressLine1 = addressLine1
  if (addressLine2 !== undefined) normalized.addressLine2 = addressLine2
  if (city !== undefined) normalized.city = city
  if (region !== undefined) normalized.region = region
  if (postalCode !== undefined) normalized.postalCode = postalCode
  if (taxNumber !== undefined) normalized.taxNumber = taxNumber

  return Object.keys(normalized).length > 0 ? normalized : null
}

export async function PATCH(request: NextRequest) {
  const currentCustomer = await getCustomer()
  if (!currentCustomer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as ProfilePayload
    const email = normalizeField(body.email)

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const payload: ProfilePayload = {
      email,
      first_name: normalizeField(body.first_name),
      last_name: normalizeField(body.last_name),
      phone: normalizeField(body.phone),
    }

    const accountProfileMetadata = buildAccountProfileMetadata(
      body.accountProfile
    )
    if (accountProfileMetadata) {
      payload.metadata = {
        ...(isRecord(currentCustomer.metadata) ? currentCustomer.metadata : {}),
        account_profile: {
          ...(isRecord(currentCustomer.metadata?.account_profile)
            ? currentCustomer.metadata.account_profile
            : {}),
          ...accountProfileMetadata,
        },
      }
    }

    const updatedCustomer = await updateCustomer(payload)

    if (!updatedCustomer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update profile'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
