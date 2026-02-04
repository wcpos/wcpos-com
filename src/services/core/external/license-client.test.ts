import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    KEYGEN_HOST: 'license.wcpos.com',
    KEYGEN_API_TOKEN: 'test-token',
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocks are set up
import { licenseClient } from './license-client'

describe('licenseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateLicenseKey', () => {
    it('returns valid result for a valid key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid: true, detail: 'is valid', code: 'VALID' },
          data: {
            id: 'license-123',
            attributes: {
              key: 'XXXX-XXXX',
              status: 'ACTIVE',
              expiry: '2027-01-01T00:00:00Z',
              maxMachines: 2,
              metadata: {},
              created: '2026-01-01T00:00:00Z',
            },
            relationships: {
              policy: { data: { id: 'policy-yearly' } },
            },
          },
        }),
      })

      const result = await licenseClient.validateLicenseKey('XXXX-XXXX')

      expect(result).toEqual({
        valid: true,
        code: 'VALID',
        detail: 'is valid',
        license: {
          id: 'license-123',
          key: 'XXXX-XXXX',
          status: 'ACTIVE',
          expiry: '2027-01-01T00:00:00Z',
          maxMachines: 2,
          metadata: {},
          policyId: 'policy-yearly',
          createdAt: '2026-01-01T00:00:00Z',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/actions/validate-key',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
          }),
          body: JSON.stringify({ meta: { key: 'XXXX-XXXX' } }),
        })
      )
    })

    it('returns invalid result for an expired key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid: false, detail: 'is expired', code: 'EXPIRED' },
          data: {
            id: 'license-456',
            attributes: {
              key: 'YYYY-YYYY',
              status: 'EXPIRED',
              expiry: '2024-01-01T00:00:00Z',
              maxMachines: 2,
              metadata: {},
              created: '2023-01-01T00:00:00Z',
            },
            relationships: {
              policy: { data: { id: 'policy-yearly' } },
            },
          },
        }),
      })

      const result = await licenseClient.validateLicenseKey('YYYY-YYYY')

      expect(result).toEqual({
        valid: false,
        code: 'EXPIRED',
        detail: 'is expired',
        license: expect.objectContaining({
          id: 'license-456',
          status: 'EXPIRED',
        }),
      })
    })

    it('returns NOT_FOUND for an unknown key (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          meta: { valid: false, detail: 'not found', code: 'NOT_FOUND' },
        }),
      })

      const result = await licenseClient.validateLicenseKey('ZZZZ-ZZZZ')

      expect(result).toEqual({
        valid: false,
        code: 'NOT_FOUND',
        detail: 'not found',
      })
    })
  })

  describe('getLicense', () => {
    it('returns license detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'license-123',
            attributes: {
              key: 'XXXX-XXXX',
              status: 'ACTIVE',
              expiry: '2027-01-01T00:00:00Z',
              maxMachines: 2,
              metadata: { tier: 'pro' },
              created: '2026-01-01T00:00:00Z',
            },
            relationships: {
              policy: { data: { id: 'policy-yearly' } },
            },
          },
        }),
      })

      const result = await licenseClient.getLicense('license-123')

      expect(result).toEqual({
        id: 'license-123',
        key: 'XXXX-XXXX',
        status: 'ACTIVE',
        expiry: '2027-01-01T00:00:00Z',
        maxMachines: 2,
        machines: [],
        metadata: { tier: 'pro' },
        policyId: 'policy-yearly',
        createdAt: '2026-01-01T00:00:00Z',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/license-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Accept: 'application/vnd.api+json',
          }),
        })
      )
    })
  })

  describe('getLicenseMachines', () => {
    it('returns array of machines', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'machine-123',
              attributes: {
                fingerprint: 'wp-instance-abc',
                name: 'mystore.com',
                metadata: { domain: 'mystore.com' },
                created: '2026-01-15T00:00:00Z',
              },
            },
            {
              id: 'machine-456',
              attributes: {
                fingerprint: 'wp-instance-def',
                name: 'otherstore.com',
                metadata: { domain: 'otherstore.com' },
                created: '2026-02-01T00:00:00Z',
              },
            },
          ],
        }),
      })

      const result = await licenseClient.getLicenseMachines('license-123')

      expect(result).toEqual([
        {
          id: 'machine-123',
          fingerprint: 'wp-instance-abc',
          name: 'mystore.com',
          metadata: { domain: 'mystore.com' },
          createdAt: '2026-01-15T00:00:00Z',
        },
        {
          id: 'machine-456',
          fingerprint: 'wp-instance-def',
          name: 'otherstore.com',
          metadata: { domain: 'otherstore.com' },
          createdAt: '2026-02-01T00:00:00Z',
        },
      ])

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/license-123/machines',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  describe('activateMachine', () => {
    it('returns id and fingerprint on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: 'machine-789',
            attributes: {
              fingerprint: 'wp-instance-new',
              name: 'newstore.com',
              metadata: { domain: 'newstore.com' },
              created: '2026-02-04T00:00:00Z',
            },
          },
        }),
      })

      const result = await licenseClient.activateMachine(
        'license-123',
        'wp-instance-new',
        { domain: 'newstore.com' }
      )

      expect(result).toEqual({
        id: 'machine-789',
        fingerprint: 'wp-instance-new',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/license-123/machines',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/vnd.api+json',
          }),
          body: JSON.stringify({
            data: {
              type: 'machines',
              attributes: {
                fingerprint: 'wp-instance-new',
                name: 'newstore.com',
                metadata: { domain: 'newstore.com' },
              },
            },
          }),
        })
      )
    })
  })

  describe('deactivateMachine', () => {
    it('returns true on success (204)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await licenseClient.deactivateMachine('machine-789')

      expect(result).toBe(true)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/machines/machine-789',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('returns false on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ errors: [{ detail: 'not found' }] }),
      })

      const result = await licenseClient.deactivateMachine('machine-nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('validateLicense', () => {
    it('maps Keygen data to LicenseStatusResponse format for an active license', async () => {
      // Mock validateLicenseKey call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid: true, detail: 'is valid', code: 'VALID' },
          data: {
            id: 'license-123',
            attributes: {
              key: 'XXXX-XXXX',
              status: 'ACTIVE',
              expiry: '2027-01-01T00:00:00Z',
              maxMachines: 5,
              metadata: {},
              created: '2026-01-01T00:00:00Z',
            },
            relationships: {
              policy: { data: { id: 'policy-yearly' } },
            },
          },
        }),
      })

      // Mock getLicenseMachines call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'machine-1',
              attributes: {
                fingerprint: 'instance-abc',
                name: 'mystore.com',
                metadata: {},
                created: '2026-01-15T00:00:00Z',
              },
            },
          ],
        }),
      })

      const result = await licenseClient.validateLicense('XXXX-XXXX', 'instance-abc')

      expect(result).toEqual({
        status: 200,
        data: {
          activated: true,
          status: 'active',
          expiresAt: '2027-01-01T00:00:00Z',
          activationsLimit: 5,
          activationsCount: 1,
          productName: 'WooCommerce POS Pro',
        },
      })
    })

    it('maps expired license correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid: false, detail: 'is expired', code: 'EXPIRED' },
          data: {
            id: 'license-456',
            attributes: {
              key: 'YYYY-YYYY',
              status: 'EXPIRED',
              expiry: '2024-01-01T00:00:00Z',
              maxMachines: 2,
              metadata: {},
              created: '2023-01-01T00:00:00Z',
            },
            relationships: {
              policy: { data: { id: 'policy-yearly' } },
            },
          },
        }),
      })

      const result = await licenseClient.validateLicense('YYYY-YYYY', 'instance-xyz')

      expect(result).toEqual({
        status: 200,
        data: {
          activated: false,
          status: 'expired',
          expiresAt: '2024-01-01T00:00:00Z',
          activationsLimit: 2,
          activationsCount: 0,
          productName: 'WooCommerce POS Pro',
        },
      })
    })

    it('maps NOT_FOUND to 404 error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          meta: { valid: false, detail: 'not found', code: 'NOT_FOUND' },
        }),
      })

      const result = await licenseClient.validateLicense('ZZZZ-ZZZZ', 'instance-xyz')

      expect(result).toEqual({
        status: 404,
        error: 'License key not found',
        message: 'not found',
      })
    })
  })
})
