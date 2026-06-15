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
              status: 'active',
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
          status: 'active',
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
              status: 'expired',
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
          status: 'expired',
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
        status: 'active',
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

    it('URL-encodes license ids before fetching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'license/123',
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

      await licenseClient.getLicense('license/123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/license%2F123',
        expect.anything()
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

    it('URL-encodes license ids when fetching machines', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await licenseClient.getLicenseMachines('license/123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/license%2F123/machines',
        expect.anything()
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

    it('URL-encodes license ids when activating a machine', async () => {
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

      await licenseClient.activateMachine('license/123', 'wp-instance-new')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/licenses/license%2F123/machines',
        expect.anything()
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

    it('URL-encodes machine ids when deactivating', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await licenseClient.deactivateMachine('machine/789')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://license.wcpos.com/v1/machines/machine%2F789',
        expect.anything()
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


  describe('Keygen adapter normalizes raw status at the seam', () => {
    const mockValidateKey = ({
      status,
      expiry,
      valid = true,
    }: {
      status: string
      expiry: string | null
      valid?: boolean
    }) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid, detail: 'detail', code: valid ? 'VALID' : 'OTHER' },
          data: {
            id: 'license-123',
            attributes: {
              key: 'KEY',
              status,
              expiry,
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
    }

    const mockGetLicense = ({
      id = 'lic_1',
      status,
      expiry,
    }: {
      id?: string
      status: string
      expiry: string | null
    }) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id,
            attributes: {
              key: 'KEY',
              status,
              expiry,
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
    }

    const mockMachines = (machines: unknown[]) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: machines }),
      })
    }

    it('validateLicenseKey returns canonical status (EXPIRING -> active)', async () => {
      mockValidateKey({ valid: true, status: 'EXPIRING', expiry: null })

      const result = await licenseClient.validateLicenseKey('KEY')

      expect(result.license?.status).toBe('active')
    })

    it('getLicenseWithMachines returns canonical status (BANNED -> revoked)', async () => {
      mockGetLicense({ status: 'BANNED', expiry: null })
      mockMachines([])

      const license = await licenseClient.getLicenseWithMachines('lic_1')

      expect(license.status).toBe('revoked')
    })

    it('getLicenseWithMachines normalizes INACTIVE -> active', async () => {
      mockGetLicense({ id: 'lic_2', status: 'INACTIVE', expiry: null })
      mockMachines([])

      const license = await licenseClient.getLicenseWithMachines('lic_2')

      expect(license.status).toBe('active')
    })
  })

  describe('validateLicense — plugin data derives from canonical status', () => {
    const mockValidateKey = ({
      status,
      expiry,
      valid = true,
    }: {
      status: string
      expiry: string | null
      valid?: boolean
    }) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid, detail: 'detail', code: valid ? 'VALID' : 'OTHER' },
          data: {
            id: 'license-123',
            attributes: {
              key: 'KEY',
              status,
              expiry,
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
    }

    const mockMachines = (machines: unknown[]) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: machines }),
      })
    }

    const cases: Array<[string, string, string, boolean]> = [
      ['ACTIVE', 'active', 'active', true],
      ['EXPIRING', 'active', 'active', true],
      ['INACTIVE', 'active', 'active', true],
      ['EXPIRED', 'expired', 'expired', false],
      ['SUSPENDED', 'inactive', 'suspended', false],
      ['BANNED', 'invalid', 'revoked', false],
    ]

    it.each(cases)(
      'raw %s -> plugin %s / entitlement %s',
      async (rawStatus, pluginStatus, entitlementStatus, valid) => {
        mockValidateKey({ valid, status: rawStatus, expiry: null })
        if (valid) mockMachines([])

        const res = await licenseClient.validateLicense('KEY', 'instance')

        expect(res.data?.status).toBe(pluginStatus)
        expect(res.entitlement?.status).toBe(entitlementStatus)
      }
    )
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
        entitlement: {
          status: 'active',
          expiry: '2027-01-01T00:00:00Z',
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
        entitlement: {
          status: 'expired',
          expiry: '2024-01-01T00:00:00Z',
        },
      })
    })

    // Keygen statuses beyond the basic three. EXPIRING and INACTIVE are
    // paid, in-term licenses and must report as 'active' to the plugin —
    // same policy as normalizeLicenseStatus (src/lib/license-status.ts).
    function mockValidation(status: string, valid: boolean, expiry: string | null) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { valid, detail: 'detail', code: valid ? 'VALID' : 'OTHER' },
          data: {
            id: 'license-789',
            attributes: {
              key: 'KEYX-KEYX',
              status,
              expiry,
              maxMachines: 3,
              metadata: {},
              created: '2026-01-01T00:00:00Z',
            },
            relationships: {
              policy: { data: { id: 'policy-yearly' } },
            },
          },
        }),
      })
    }

    it('treats EXPIRING as active — paid, in-term, days from expiry', async () => {
      mockValidation('EXPIRING', true, '2026-06-14T00:00:00Z')
      // getLicenseMachines call (validation.valid gates the fetch)
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })

      const result = await licenseClient.validateLicense('KEYX-KEYX', 'instance-abc')

      expect(result).toEqual({
        status: 200,
        data: {
          activated: false,
          status: 'active',
          expiresAt: '2026-06-14T00:00:00Z',
          activationsLimit: 3,
          activationsCount: 0,
          productName: 'WooCommerce POS Pro',
        },
        entitlement: {
          status: 'active',
          expiry: '2026-06-14T00:00:00Z',
        },
      })
    })

    it('treats INACTIVE as active — paid, in-term, just idle', async () => {
      mockValidation('INACTIVE', true, '2026-12-01T00:00:00Z')
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })

      const result = await licenseClient.validateLicense('KEYX-KEYX', 'instance-abc')

      expect(result.data?.status).toBe('active')
      expect(result.data?.expiresAt).toBe('2026-12-01T00:00:00Z')
      expect(result.entitlement?.status).toBe('active')
    })

    it('maps SUSPENDED to plugin-display inactive but canonical suspended entitlement', async () => {
      mockValidation('SUSPENDED', false, '2099-01-01T00:00:00Z')

      const result = await licenseClient.validateLicense('KEYX-KEYX', 'instance-abc')

      expect(result.data?.status).toBe('inactive')
      expect(result.data?.activated).toBe(false)
      // The display value 'inactive' collides with the canonical vocabulary
      // (where 'inactive' is an in-term Keygen status) — entitlement must
      // carry the canonical 'suspended', which grants nothing (ADR-0001).
      expect(result.entitlement).toEqual({
        status: 'suspended',
        expiry: '2099-01-01T00:00:00Z',
      })
    })

    it('maps BANNED (Keygen terminal status) to invalid / revoked entitlement', async () => {
      mockValidation('BANNED', false, null)

      const result = await licenseClient.validateLicense('KEYX-KEYX', 'instance-abc')

      expect(result.data?.status).toBe('invalid')
      expect(result.data?.activated).toBe(false)
      expect(result.entitlement?.status).toBe('revoked')
    })

    it('fails closed to invalid/unknown for unrecognized statuses', async () => {
      mockValidation('SOMETHING_NEW', false, null)

      const result = await licenseClient.validateLicense('KEYX-KEYX', 'instance-abc')

      expect(result.data?.status).toBe('invalid')
      expect(result.entitlement?.status).toBe('unknown')
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
