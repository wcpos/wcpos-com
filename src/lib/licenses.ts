import type { MedusaOrder } from './medusa-auth'

type RawLicenseEntry = Record<string, unknown>

export interface LicenseReference {
  id?: string
  key?: string
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function getLicenseReference(entry: RawLicenseEntry): LicenseReference | null {
  const id =
    normalizeString(entry.license_id) ??
    normalizeString(entry.licenseId) ??
    normalizeString(entry.id)

  const key =
    normalizeString(entry.license_key) ??
    normalizeString(entry.licenseKey) ??
    normalizeString(entry.key)

  if (!id && !key) {
    return null
  }

  return { id, key }
}

function parseJsonIfString(value: unknown): unknown {
  const normalized = normalizeString(value)
  if (!normalized) return value

  try {
    return JSON.parse(normalized)
  } catch {
    return value
  }
}

function coerceLicenseEntries(value: unknown): RawLicenseEntry[] {
  const parsed = parseJsonIfString(value)

  if (Array.isArray(parsed)) {
    return parsed.filter(
      (entry): entry is RawLicenseEntry =>
        Boolean(entry) && typeof entry === 'object'
    )
  }

  if (parsed && typeof parsed === 'object') {
    return [parsed as RawLicenseEntry]
  }

  return []
}

function upsertLicenseReference(
  references: LicenseReference[],
  reference: LicenseReference
) {
  const existing = references.find(
    (current) =>
      (reference.id && current.id === reference.id) ||
      (reference.key && current.key === reference.key)
  )

  if (existing) {
    if (!existing.id && reference.id) existing.id = reference.id
    if (!existing.key && reference.key) existing.key = reference.key
    return
  }

  references.push(reference)
}

function collectReferencesFromValue(
  value: unknown,
  references: LicenseReference[]
) {
  const entries = coerceLicenseEntries(value)
  for (const entry of entries) {
    const reference = getLicenseReference(entry)
    if (reference) {
      upsertLicenseReference(references, reference)
    }
  }
}

function collectReferencesFromMetadata(
  metadata: Record<string, unknown> | undefined,
  references: LicenseReference[]
) {
  if (!metadata) return

  collectReferencesFromValue(metadata.licenses, references)
  collectReferencesFromValue(metadata.license, references)
  collectReferencesFromValue(metadata.license_data, references)
  collectReferencesFromValue(metadata.licenseData, references)

  const directReference = getLicenseReference(metadata)
  if (directReference) {
    upsertLicenseReference(references, directReference)
  }
}

export function extractLicenseReferencesFromOrders(
  orders: MedusaOrder[]
): LicenseReference[] {
  const references: LicenseReference[] = []

  for (const order of orders) {
    collectReferencesFromMetadata(order.metadata, references)

    for (const item of order.items) {
      collectReferencesFromMetadata(item.metadata, references)
    }
  }

  return references
}

export function extractLicenseIdsFromOrders(orders: MedusaOrder[]): string[] {
  return extractLicenseReferencesFromOrders(orders)
    .flatMap((reference) => (reference.id ? [reference.id] : []))
}
