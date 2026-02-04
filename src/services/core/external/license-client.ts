import 'server-only'

import { env } from '@/utils/env'
import { licenseLogger } from '@/lib/logger'
import type {
  LicenseStatusResponse,
  LicenseDetail,
  LicenseMachine,
} from '@/types/license'

/**
 * License Client — Keygen CE API integration
 *
 * Handles license validation, machine activation/deactivation,
 * and backward-compatible license status checks for the Pro plugin.
 */

const BASE_URL = `https://${env.KEYGEN_HOST}`

const JSON_API_HEADERS = {
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
}

function authHeaders() {
  return {
    ...JSON_API_HEADERS,
    Authorization: `Bearer ${env.KEYGEN_API_TOKEN}`,
  }
}

// ---- JSON:API response shape helpers ----

interface KeygenLicenseAttributes {
  key: string
  status: string
  expiry: string | null
  maxMachines: number
  metadata: Record<string, unknown>
  created: string
}

interface KeygenLicenseData {
  id: string
  attributes: KeygenLicenseAttributes
  relationships: {
    policy: { data: { id: string } }
  }
}

interface KeygenMachineAttributes {
  fingerprint: string
  name: string | null
  metadata: Record<string, unknown>
  created: string
}

interface KeygenMachineData {
  id: string
  attributes: KeygenMachineAttributes
}

interface ValidateKeyResponse {
  meta: { valid: boolean; detail: string; code: string }
  data?: KeygenLicenseData
}

// ---- Mapping helpers ----

function mapLicenseData(
  data: KeygenLicenseData
): Omit<LicenseDetail, 'machines'> {
  return {
    id: data.id,
    key: data.attributes.key,
    status: data.attributes.status,
    expiry: data.attributes.expiry,
    maxMachines: data.attributes.maxMachines,
    metadata: data.attributes.metadata,
    policyId: data.relationships.policy.data.id,
    createdAt: data.attributes.created,
  }
}

function mapMachineData(data: KeygenMachineData): LicenseMachine {
  return {
    id: data.id,
    fingerprint: data.attributes.fingerprint,
    name: data.attributes.name,
    metadata: data.attributes.metadata,
    createdAt: data.attributes.created,
  }
}

// ---- Public API ----

/**
 * Validate a license key (no auth required).
 *
 * POST /v1/licenses/actions/validate-key
 */
async function validateLicenseKey(key: string): Promise<{
  valid: boolean
  code: string
  detail: string
  license?: Omit<LicenseDetail, 'machines'>
}> {
  const res = await fetch(
    `${BASE_URL}/v1/licenses/actions/validate-key`,
    {
      method: 'POST',
      headers: JSON_API_HEADERS,
      body: JSON.stringify({ meta: { key } }),
    }
  )

  const json: ValidateKeyResponse = await res.json()

  const result: {
    valid: boolean
    code: string
    detail: string
    license?: Omit<LicenseDetail, 'machines'>
  } = {
    valid: json.meta.valid,
    code: json.meta.code,
    detail: json.meta.detail,
  }

  if (json.data) {
    result.license = mapLicenseData(json.data)
  }

  return result
}

/**
 * Get a license by ID (requires auth).
 *
 * GET /v1/licenses/{id}
 */
async function getLicense(licenseId: string): Promise<LicenseDetail> {
  const res = await fetch(`${BASE_URL}/v1/licenses/${licenseId}`, {
    method: 'GET',
    headers: authHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Keygen getLicense failed (${res.status}): ${await res.text()}`)
  }

  const json: { data: KeygenLicenseData } = await res.json()
  const mapped = mapLicenseData(json.data)

  return { ...mapped, machines: [] }
}

/**
 * Get machines for a license (requires auth).
 *
 * GET /v1/licenses/{id}/machines
 */
async function getLicenseMachines(
  licenseId: string
): Promise<LicenseMachine[]> {
  const res = await fetch(
    `${BASE_URL}/v1/licenses/${licenseId}/machines`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  )

  if (!res.ok) {
    throw new Error(`Keygen getLicenseMachines failed (${res.status}): ${await res.text()}`)
  }

  const json: { data: KeygenMachineData[] } = await res.json()

  return json.data.map(mapMachineData)
}

/**
 * Activate a machine for a license (requires auth).
 *
 * POST /v1/licenses/{id}/machines
 */
async function activateMachine(
  licenseId: string,
  fingerprint: string,
  metadata: Record<string, unknown> = {}
): Promise<{ id: string; fingerprint: string } | null> {
  const name = (metadata.domain as string) ?? null

  const res = await fetch(
    `${BASE_URL}/v1/licenses/${licenseId}/machines`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        data: {
          type: 'machines',
          attributes: { fingerprint, name, metadata },
        },
      }),
    }
  )

  if (!res.ok) {
    licenseLogger.error`activateMachine failed (${res.status})`
    return null
  }

  const json: { data: KeygenMachineData } = await res.json()

  return { id: json.data.id, fingerprint: json.data.attributes.fingerprint }
}

/**
 * Deactivate (delete) a machine (requires auth).
 *
 * DELETE /v1/machines/{id}
 */
async function deactivateMachine(machineId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/v1/machines/${machineId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  return res.ok
}

/**
 * Convenience: get a license with its machines populated.
 */
async function getLicenseWithMachines(
  licenseId: string
): Promise<LicenseDetail> {
  const [license, machines] = await Promise.all([
    getLicense(licenseId),
    getLicenseMachines(licenseId),
  ])

  return { ...license, machines }
}

/**
 * Backward-compatible wrapper used by existing Pro plugin API routes.
 *
 * Maps Keygen validate-key + machines data into the LicenseStatusResponse
 * format that the rest of the codebase expects.
 */
async function validateLicense(
  licenseKey: string,
  instance: string
): Promise<LicenseStatusResponse> {
  const validation = await validateLicenseKey(licenseKey)

  if (validation.code === 'NOT_FOUND') {
    return {
      status: 404,
      error: 'License key not found',
      message: validation.detail,
    }
  }

  if (!validation.license) {
    return {
      status: 400,
      error: 'Validation failed',
      message: validation.detail,
    }
  }

  const license = validation.license

  // For valid licenses, fetch machines to get activation count
  // and check if this instance is activated
  let activationsCount = 0
  let activated = false

  if (validation.valid && license.id) {
    try {
      const machines = await getLicenseMachines(license.id)
      activationsCount = machines.length
      activated = machines.some((m) => m.fingerprint === instance)
    } catch {
      // If we can't fetch machines, still return what we have
    }
  }

  const keygenStatus = license.status.toUpperCase()
  const statusMap: Record<string, LicenseStatusResponse['data']> = {
    ACTIVE: {
      activated,
      status: 'active',
      expiresAt: license.expiry ?? undefined,
      activationsLimit: license.maxMachines,
      activationsCount,
      productName: 'WooCommerce POS Pro',
    },
    EXPIRED: {
      activated: false,
      status: 'expired',
      expiresAt: license.expiry ?? undefined,
      activationsLimit: license.maxMachines,
      activationsCount,
      productName: 'WooCommerce POS Pro',
    },
    SUSPENDED: {
      activated: false,
      status: 'inactive',
      productName: 'WooCommerce POS Pro',
    },
  }

  return {
    status: 200,
    data: statusMap[keygenStatus] ?? {
      activated: false,
      status: 'invalid',
      productName: 'WooCommerce POS Pro',
    },
  }
}

export const licenseClient = {
  validateLicenseKey,
  getLicense,
  getLicenseMachines,
  activateMachine,
  deactivateMachine,
  getLicenseWithMachines,
  validateLicense,
}
