import 'server-only'

import { env } from '@/utils/env'
import {
  normalizeLicenseStatus,
  type CanonicalLicenseStatus,
} from '@/lib/license-status'
import { licenseLogger } from '@/lib/logger'
import type {
  LicenseStatusResponse,
  LicenseDetail,
  LicenseMachine,
} from '@/types/license'
import { getKeygenBaseUrl } from './keygen-base-url'

/**
 * License Client — Keygen CE API integration
 *
 * Handles license validation, machine activation/deactivation,
 * and backward-compatible license status checks for the Pro plugin.
 */

const BASE_URL = getKeygenBaseUrl(env.KEYGEN_HOST, env.NODE_ENV)

/**
 * A non-2xx Keygen response. Carries the HTTP status so callers can tell
 * "this license does not exist" (404 — data, e.g. legacy migrated references
 * that never made it into Keygen) apart from "Keygen is unhappy" (incident).
 */
export class KeygenRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'KeygenRequestError'
  }
}

/**
 * Thrown when an authenticated Keygen operation is attempted but no
 * `KEYGEN_API_TOKEN` is configured. Fail LOUD rather than silently sending
 * `Bearer undefined` (which 401s and, historically, degraded into a misleading
 * "0 activations"). Read paths do not need auth — they use public validate-key —
 * so only genuine management operations (machine list, deactivation) hit this.
 */
export class KeygenAuthNotConfiguredError extends Error {
  constructor() {
    super(
      'KEYGEN_API_TOKEN is not configured; authenticated Keygen operations (machine management) are unavailable.'
    )
    this.name = 'KeygenAuthNotConfiguredError'
  }
}

const JSON_API_HEADERS = {
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
}

/** True when authenticated Keygen calls (machine list, deactivation) are possible. */
function canAuthenticate(): boolean {
  return Boolean(env.KEYGEN_API_TOKEN)
}

function authHeaders() {
  if (!env.KEYGEN_API_TOKEN) {
    throw new KeygenAuthNotConfiguredError()
  }
  return {
    ...JSON_API_HEADERS,
    Authorization: `Bearer ${env.KEYGEN_API_TOKEN}`,
  }
}

function encodeKeygenPathSegment(value: string): string {
  return encodeURIComponent(value)
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
    // Present on validate-key responses; `meta.count` is the authoritative
    // active-machine (activation) count and needs NO admin token.
    machines?: { meta?: { count?: number } }
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
    // Canonical by construction: raw Keygen status is normalized here, at the
    // adapter seam, so every LicenseDetail downstream carries canonical status.
    status: normalizeLicenseStatus(data.attributes.status),
    expiry: data.attributes.expiry,
    maxMachines: data.attributes.maxMachines,
    // Authoritative activation count from the machines relationship meta. This
    // is present on the public validate-key response — no admin token needed.
    activationCount: data.relationships.machines?.meta?.count ?? 0,
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
  const encodedLicenseId = encodeKeygenPathSegment(licenseId)
  const res = await fetch(`${BASE_URL}/v1/licenses/${encodedLicenseId}`, {
    method: 'GET',
    headers: authHeaders(),
  })

  if (!res.ok) {
    throw new KeygenRequestError(
      `Keygen getLicense failed (${res.status}): ${await res.text()}`,
      res.status
    )
  }

  const json: { data: KeygenLicenseData } = await res.json()
  const mapped = mapLicenseData(json.data)

  return { ...mapped, machines: [] }
}

/**
 * List every license in the account (requires auth), paged.
 *
 * GET /v1/licenses?page[size]=100&page[number]=N
 *
 * The Discord "Customer info" lookup needs licence metadata fleet-wide;
 * paging Keygen directly (~25 requests for the current fleet) is orders of
 * magnitude cheaper than resolving licences through admin customers → orders.
 */
async function listAllLicenses(): Promise<Omit<LicenseDetail, 'machines'>[]> {
  const PAGE_SIZE = 100
  // Backstop against a paging bug looping forever; 500 pages = 50k licences,
  // far beyond the current fleet.
  const MAX_PAGES = 500
  const licenses: Omit<LicenseDetail, 'machines'>[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `${BASE_URL}/v1/licenses?page[size]=${PAGE_SIZE}&page[number]=${page}`,
      { method: 'GET', headers: authHeaders() }
    )

    if (!res.ok) {
      throw new KeygenRequestError(
        `Keygen listAllLicenses failed (${res.status}): ${await res.text()}`,
        res.status
      )
    }

    const json: { data: KeygenLicenseData[] } = await res.json()
    licenses.push(...json.data.map(mapLicenseData))
    if (json.data.length < PAGE_SIZE) break
  }

  return licenses
}

/**
 * Get machines for a license (requires auth).
 *
 * GET /v1/licenses/{id}/machines
 */
async function getLicenseMachines(
  licenseId: string
): Promise<LicenseMachine[]> {
  const encodedLicenseId = encodeKeygenPathSegment(licenseId)
  const res = await fetch(
    `${BASE_URL}/v1/licenses/${encodedLicenseId}/machines`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  )

  if (!res.ok) {
    throw new KeygenRequestError(
      `Keygen getLicenseMachines failed (${res.status}): ${await res.text()}`,
      res.status
    )
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
  const encodedLicenseId = encodeKeygenPathSegment(licenseId)

  const res = await fetch(
    `${BASE_URL}/v1/licenses/${encodedLicenseId}/machines`,
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
  const encodedMachineId = encodeKeygenPathSegment(machineId)
  const res = await fetch(`${BASE_URL}/v1/machines/${encodedMachineId}`, {
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
  const license = await getLicense(licenseId)
  const machines = await getLicenseMachines(licenseId)

  // With the full authed list in hand, its length is the authoritative count
  // (the authed GET /licenses/{id} response carries no machines-relationship
  // meta, so `license.activationCount` from it would be 0).
  return { ...license, machines, activationCount: machines.length }
}


/**
 * Update license metadata (requires auth).
 *
 * PATCH /v1/licenses/{id}
 */
async function updateLicenseMetadata(
  licenseId: string,
  metadata: Record<string, unknown>
): Promise<LicenseDetail> {
  const encodedLicenseId = encodeKeygenPathSegment(licenseId)
  const res = await fetch(`${BASE_URL}/v1/licenses/${encodedLicenseId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      data: {
        type: 'licenses',
        id: licenseId,
        attributes: { metadata },
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Keygen updateLicenseMetadata failed (${res.status}): ${await res.text()}`)
  }

  const json: { data: KeygenLicenseData } = await res.json()
  return { ...mapLicenseData(json.data), machines: [] }
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

  // Activation count comes from validate-key (public, authoritative) — correct
  // even without a Keygen admin token. The machine LIST is only needed for the
  // per-instance `activated` check, and is a best-effort authed enrichment.
  const activationsCount = license.activationCount
  let activated = false

  if (validation.valid && license.id && canAuthenticate()) {
    try {
      const machines = await getLicenseMachines(license.id)
      activated = machines.some((m) => m.fingerprint === instance)
    } catch (error) {
      licenseLogger.warn`Machine list unavailable for ${license.id}; per-instance activation state may be incomplete: ${error}`
    }
  }

  const activeData: LicenseStatusResponse['data'] = {
    activated,
    status: 'active',
    expiresAt: license.expiry ?? undefined,
    activationsLimit: license.maxMachines,
    activationsCount,
    productName: 'WCPOS Pro',
  }

  // Plugin display vocabulary (active/expired/inactive/invalid) derived from
  // the CANONICAL status. 'suspended' -> plugin 'inactive'; 'revoked'/'unknown'
  // -> plugin 'invalid'. Output is identical to the previous raw-keyed map.
  const pluginDataByCanonical: Record<
    CanonicalLicenseStatus,
    LicenseStatusResponse['data']
  > = {
    active: activeData,
    expired: {
      activated: false,
      status: 'expired',
      expiresAt: license.expiry ?? undefined,
      activationsLimit: license.maxMachines,
      activationsCount,
      productName: 'WCPOS Pro',
    },
    suspended: {
      activated: false,
      status: 'inactive',
      productName: 'WCPOS Pro',
    },
    revoked: {
      activated: false,
      status: 'invalid',
      productName: 'WCPOS Pro',
    },
    unknown: {
      activated: false,
      status: 'invalid',
      productName: 'WCPOS Pro',
    },
  }

  return {
    status: 200,
    data: pluginDataByCanonical[license.status],
    // Entitlement carries the canonical status straight through — it is already
    // normalized at the adapter seam.
    entitlement: {
      status: license.status,
      expiry: license.expiry,
    },
  }
}

export const licenseClient = {
  validateLicenseKey,
  getLicense,
  listAllLicenses,
  getLicenseMachines,
  activateMachine,
  deactivateMachine,
  getLicenseWithMachines,
  updateLicenseMetadata,
  validateLicense,
  /** Whether authenticated Keygen operations (machine list, deactivation) are
   *  possible — i.e. a KEYGEN_API_TOKEN is configured. */
  canManageMachines: canAuthenticate,
}
