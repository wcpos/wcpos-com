import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock the license client
const mockValidateLicenseKey = vi.fn()
const mockActivateMachine = vi.fn()
const mockDeactivateMachine = vi.fn()
const mockGetLicenseWithMachines = vi.fn()

vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    validateLicenseKey: (...args: unknown[]) =>
      mockValidateLicenseKey(...args),
    activateMachine: (...args: unknown[]) => mockActivateMachine(...args),
    deactivateMachine: (...args: unknown[]) =>
      mockDeactivateMachine(...args),
    getLicenseWithMachines: (...args: unknown[]) =>
      mockGetLicenseWithMachines(...args),
  },
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/test/license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/test/license', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 403 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await POST(makeRequest({ action: 'validate', licenseKey: 'test' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not available in production')
  })

  describe('validate action', () => {
    it('returns 400 when licenseKey is missing', async () => {
      const res = await POST(makeRequest({ action: 'validate' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('licenseKey required')
    })

    it('calls validateLicenseKey and returns result', async () => {
      const mockResult = {
        valid: true,
        code: 'VALID',
        detail: 'is valid',
        license: { id: 'lic-1', key: 'XXXX' },
      }
      mockValidateLicenseKey.mockResolvedValueOnce(mockResult)

      const res = await POST(
        makeRequest({ action: 'validate', licenseKey: 'XXXX' })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual(mockResult)
      expect(mockValidateLicenseKey).toHaveBeenCalledWith('XXXX')
    })
  })

  describe('activate action', () => {
    it('returns 400 when licenseId is missing', async () => {
      const res = await POST(
        makeRequest({ action: 'activate', fingerprint: 'fp-1' })
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('licenseId and fingerprint required')
    })

    it('returns 400 when fingerprint is missing', async () => {
      const res = await POST(
        makeRequest({ action: 'activate', licenseId: 'lic-1' })
      )
      expect(res.status).toBe(400)
    })

    it('returns 422 when activation fails', async () => {
      mockActivateMachine.mockResolvedValueOnce(null)

      const res = await POST(
        makeRequest({
          action: 'activate',
          licenseId: 'lic-1',
          fingerprint: 'fp-1',
        })
      )
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error).toContain('Activation failed')
    })

    it('returns machine data on successful activation', async () => {
      const mockMachine = { id: 'machine-1', fingerprint: 'fp-1' }
      mockActivateMachine.mockResolvedValueOnce(mockMachine)

      const res = await POST(
        makeRequest({
          action: 'activate',
          licenseId: 'lic-1',
          fingerprint: 'fp-1',
          metadata: { domain: 'test.com' },
        })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ success: true, machine: mockMachine })
      expect(mockActivateMachine).toHaveBeenCalledWith(
        'lic-1',
        'fp-1',
        { domain: 'test.com' }
      )
    })
  })

  describe('deactivate action', () => {
    it('returns 400 when machineId is missing', async () => {
      const res = await POST(makeRequest({ action: 'deactivate' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('machineId required')
    })

    it('calls deactivateMachine and returns result', async () => {
      mockDeactivateMachine.mockResolvedValueOnce(true)

      const res = await POST(
        makeRequest({ action: 'deactivate', machineId: 'machine-1' })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ success: true })
      expect(mockDeactivateMachine).toHaveBeenCalledWith('machine-1')
    })
  })

  describe('status action', () => {
    it('returns 400 when licenseId is missing', async () => {
      const res = await POST(makeRequest({ action: 'status' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('licenseId required')
    })

    it('returns license with machines', async () => {
      const mockLicense = {
        id: 'lic-1',
        key: 'XXXX',
        status: 'ACTIVE',
        machines: [{ id: 'machine-1', fingerprint: 'fp-1' }],
      }
      mockGetLicenseWithMachines.mockResolvedValueOnce(mockLicense)

      const res = await POST(
        makeRequest({ action: 'status', licenseId: 'lic-1' })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ license: mockLicense })
      expect(mockGetLicenseWithMachines).toHaveBeenCalledWith('lic-1')
    })
  })

  it('returns 400 for unknown action', async () => {
    const res = await POST(makeRequest({ action: 'unknown' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Unknown action: unknown')
  })

  it('returns 500 when licenseClient throws', async () => {
    mockValidateLicenseKey.mockRejectedValueOnce(
      new Error('Connection refused')
    )

    const res = await POST(
      makeRequest({ action: 'validate', licenseKey: 'XXXX' })
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Connection refused')
  })
})
