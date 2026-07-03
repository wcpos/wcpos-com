const AVATAR_METADATA_KEYS = [
  'oauth_avatar_url',
  'avatar_url',
  'avatarUrl',
  'picture',
  'image',
  'image_url',
  'photo_url',
  'profile_image_url',
] as const

const ACCOUNT_PROFILE_FIELDS = [
  'avatarDataUrl',
  'avatarUrl',
  'countryCode',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'taxNumber',
] as const

const RECEIPT_PROFILE_FIELDS = [
  'countryCode',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'taxNumber',
] as const

export interface AccountProfileMetadata {
  avatarDataUrl: string
  avatarUrl: string
  countryCode: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  taxNumber: string
}

export interface AccountProfileMetadataRead {
  profile: AccountProfileMetadata
  hasCountryCode: boolean
}

export type AccountProfilePatchInput = Record<string, unknown> | null | undefined

export type ReceiptAccountProfileMetadata = Record<
  (typeof RECEIPT_PROFILE_FIELDS)[number],
  string | null
>

export type ClientProfileMetadata = Partial<
  Record<(typeof AVATAR_METADATA_KEYS)[number], string>
> & {
  account_profile?: AccountProfileMetadata
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function normalizePatchField(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function rawAccountProfile(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return isRecord(metadata?.account_profile) ? metadata.account_profile : {}
}

export function readAccountProfileMetadata(
  metadata: Record<string, unknown> | null | undefined
): AccountProfileMetadata {
  return readAccountProfileMetadataWithPresence(metadata).profile
}

export function readAccountProfileMetadataWithPresence(
  metadata: Record<string, unknown> | null | undefined
): AccountProfileMetadataRead {
  const accountProfile = rawAccountProfile(metadata)
  const countryCode = asString(accountProfile.countryCode)

  return {
    profile: {
      avatarDataUrl: asString(accountProfile.avatarDataUrl),
      avatarUrl: asString(accountProfile.avatarUrl),
      countryCode: countryCode || 'US',
      addressLine1: asString(accountProfile.addressLine1),
      addressLine2: asString(accountProfile.addressLine2),
      city: asString(accountProfile.city),
      region: asString(accountProfile.region),
      postalCode: asString(accountProfile.postalCode),
      taxNumber: asString(accountProfile.taxNumber),
    },
    hasCountryCode: Boolean(countryCode),
  }
}

export function getCustomProfileAvatar(
  metadata: Record<string, unknown> | null | undefined
): Pick<AccountProfileMetadata, 'avatarDataUrl' | 'avatarUrl'> {
  const accountProfile = readAccountProfileMetadata(metadata)
  return {
    avatarDataUrl: accountProfile.avatarDataUrl,
    avatarUrl: accountProfile.avatarUrl,
  }
}

export function mergeAccountProfileMetadataPatch(
  metadata: Record<string, unknown> | null | undefined,
  input: AccountProfilePatchInput
): Record<string, unknown> | null {
  if (!isRecord(input)) return null

  const normalized: Record<string, string | null> = {}
  for (const field of ACCOUNT_PROFILE_FIELDS) {
    const value = normalizePatchField(input[field])
    if (value !== undefined) normalized[field] = value
  }

  if (Object.keys(normalized).length === 0) return null

  const currentMetadata = isRecord(metadata) ? metadata : {}
  const currentAccountProfile = rawAccountProfile(currentMetadata)

  return {
    ...currentMetadata,
    account_profile: {
      ...currentAccountProfile,
      ...normalized,
    },
  }
}

export function projectProfileMetadataForClient(
  metadata: Record<string, unknown> | null | undefined
): ClientProfileMetadata | undefined {
  if (!isRecord(metadata)) return undefined

  const projected: ClientProfileMetadata = {}
  for (const key of AVATAR_METADATA_KEYS) {
    const value = metadata[key]
    if (typeof value === 'string') projected[key] = value
  }

  if (isRecord(metadata.account_profile)) {
    projected.account_profile = readAccountProfileMetadata(metadata)
  }

  return Object.keys(projected).length > 0 ? projected : undefined
}

export function projectAccountProfileForReceipt(
  metadata: Record<string, unknown> | null | undefined
): ReceiptAccountProfileMetadata {
  const accountProfile = rawAccountProfile(metadata)
  const projected = {} as ReceiptAccountProfileMetadata

  for (const field of RECEIPT_PROFILE_FIELDS) {
    projected[field] = stringOrNull(accountProfile[field])
  }

  return projected
}
