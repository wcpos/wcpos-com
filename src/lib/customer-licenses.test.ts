import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCustomer = vi.fn()
const mockGetAllOrders = vi.fn()
const mockGetLicenseWithMachines = vi.fn()
const mockValidateLicenseKey = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/lib/customer-orders', () => ({
  getAllOrders: (...args: unknown[]) => mockGetAllOrders(...args),
}))

vi.mock('@/services/core/external/license-client', () => {
  class KeygenRequestError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'KeygenRequestError'
    }
  }
  return {
    KeygenRequestError,
    licenseClient: {
      getLicenseWithMachines: (...args: unknown[]) =>
        mockGetLicenseWithMachines(...args),
      validateLicenseKey: (...args: unknown[]) =>
        mockValidateLicenseKey(...args),
    },
  }
})

import { KeygenRequestError } from '@/services/core/external/license-client'


import { getResolvedCustomerLicenses } from './customer-licenses'

describe('getResolvedCustomerLicenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthenticated when customer is missing', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const result = await getResolvedCustomerLicenses()
    expect(result.authenticated).toBe(false)
    expect(result.licenses).toEqual([])
  })

  it('resolves licenses from key-only metadata', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_1',
        status: 'completed',
        display_id: 1,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ license_key: 'WCPOS-AAAA-1111' }],
        },
      },
    ])
    mockValidateLicenseKey.mockResolvedValueOnce({
      valid: true,
      code: 'VALID',
      detail: 'ok',
      license: {
        id: 'lic_1',
        key: 'WCPOS-AAAA-1111',
        status: 'active',
        expiry: null,
        maxMachines: 1,
        metadata: {},
        policyId: 'policy_1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    })

    const result = await getResolvedCustomerLicenses()

    expect(result.authenticated).toBe(true)
    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].key).toBe('WCPOS-AAAA-1111')
    // EXPIRING is a paid, in-term Keygen status and must surface as active.
    expect(result.licenses[0].status).toBe('active')
  })

  it('normalizes raw Keygen statuses on the id-resolution path', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_1',
        status: 'completed',
        display_id: 1,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ license_id: 'lic_2', license_key: 'WCPOS-BBBB-2222' }],
        },
      },
    ])
    mockGetLicenseWithMachines.mockResolvedValueOnce({
      id: 'lic_2',
      key: 'WCPOS-BBBB-2222',
      status: 'EXPIRING',
      expiry: '2026-06-03T00:00:00Z',
      maxMachines: 1,
      machines: [],
      metadata: {},
      policyId: 'policy_1',
      createdAt: '2026-01-01T00:00:00Z',
    })

    const result = await getResolvedCustomerLicenses()

    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].status).toBe('active')
  })

  it('always resolves licenses for the current session customer', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_session' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_session',
        status: 'completed',
        display_id: 3,
        email: 'session@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [{ license_key: 'WCPOS-SESSION-3333' }],
        },
      },
    ])
    mockValidateLicenseKey.mockResolvedValueOnce({
      valid: true,
      code: 'VALID',
      detail: 'ok',
      license: {
        id: 'lic_session',
        key: 'WCPOS-SESSION-3333',
        status: 'ACTIVE',
        expiry: null,
        maxMachines: 1,
        metadata: {},
        policyId: 'policy_1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    })

    const result = await getResolvedCustomerLicenses()

    expect(mockGetCustomer).toHaveBeenCalledTimes(1)
    expect(mockGetAllOrders).toHaveBeenCalledTimes(1)
    expect(result.authenticated).toBe(true)
    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].key).toBe('WCPOS-SESSION-3333')
  })
  it('skips references whose license does not exist in Keygen (404) without a placeholder row', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_legacy',
        status: 'completed',
        display_id: 9,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2021-04-03T00:00:00Z',
        updated_at: '2021-04-03T00:00:00Z',
        items: [],
        metadata: {
          legacy: true,
          licenses: [
            { license_id: 'lic_missing', license_key: 'WCPOS-GONE-0000' },
          ],
        },
      },
    ])
    mockGetLicenseWithMachines.mockRejectedValueOnce(
      new KeygenRequestError('Keygen getLicense failed (404): not found', 404)
    )
    mockValidateLicenseKey.mockResolvedValueOnce({
      valid: false,
      code: 'NOT_FOUND',
      detail: 'does not exist',
      license: null,
    })

    const result = await getResolvedCustomerLicenses()

    // Key fallback ran and also came up empty: no 'unknown' placeholder row.
    expect(mockValidateLicenseKey).toHaveBeenCalledWith('WCPOS-GONE-0000')
    expect(result.licenses).toEqual([])
  })

  it('rescues a stale id via the key fallback when the key is still live in Keygen', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_stale_id',
        status: 'completed',
        display_id: 12,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2021-04-03T00:00:00Z',
        updated_at: '2021-04-03T00:00:00Z',
        items: [],
        metadata: {
          legacy: true,
          licenses: [
            { license_id: 'lic_stale', license_key: 'WCPOS-LIVE-0003' },
          ],
        },
      },
    ])
    mockGetLicenseWithMachines.mockRejectedValueOnce(
      new KeygenRequestError('Keygen getLicense failed (404): not found', 404)
    )
    mockValidateLicenseKey.mockResolvedValueOnce({
      valid: true,
      code: 'VALID',
      detail: 'ok',
      license: {
        id: 'lic_reissued',
        key: 'WCPOS-LIVE-0003',
        status: 'active',
        expiry: null,
        maxMachines: 1,
        metadata: {},
        policyId: 'policy_1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    })

    const result = await getResolvedCustomerLicenses()

    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].id).toBe('lic_reissued')
    expect(result.licenses[0].status).toBe('active')
  })

  it('still falls back to key validation and placeholder on non-404 Keygen errors', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_outage',
        status: 'completed',
        display_id: 10,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [
            { license_id: 'lic_outage', license_key: 'WCPOS-DOWN-0001' },
          ],
        },
      },
    ])
    mockGetLicenseWithMachines.mockRejectedValueOnce(
      new KeygenRequestError('Keygen getLicense failed (503): boom', 503)
    )
    mockValidateLicenseKey.mockRejectedValueOnce(new Error('still down'))

    const result = await getResolvedCustomerLicenses()

    // Transient outage: the key is still shown as an 'unknown' placeholder.
    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].key).toBe('WCPOS-DOWN-0001')
    expect(result.licenses[0].status).toBe('unknown')
  })

  it('keeps the placeholder when key validation throws after an id 404', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_validation_outage',
        status: 'completed',
        display_id: 13,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: {
          licenses: [
            { license_id: 'lic_stale', license_key: 'WCPOS-DOWN-4040' },
          ],
        },
      },
    ])
    mockGetLicenseWithMachines.mockRejectedValueOnce(
      new KeygenRequestError('Keygen getLicense failed (404): not found', 404)
    )
    mockValidateLicenseKey.mockRejectedValueOnce(new Error('Keygen timeout'))

    const result = await getResolvedCustomerLicenses()

    expect(result.licenses).toHaveLength(1)
    expect(result.licenses[0].key).toBe('WCPOS-DOWN-4040')
    expect(result.licenses[0].status).toBe('unknown')
  })

  it('ignores license references on canceled orders', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([
      {
        id: 'order_cancelled',
        status: 'canceled',
        display_id: 11,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2021-04-03T00:00:00Z',
        updated_at: '2021-04-03T00:00:00Z',
        items: [],
        metadata: {
          legacy: true,
          wc_order_status: 'wc-cancelled',
          licenses: [
            { license_id: 'lic_cancelled', license_key: 'WCPOS-CANC-0002' },
          ],
        },
      },
    ])

    const result = await getResolvedCustomerLicenses()

    expect(result.licenses).toEqual([])
    expect(mockGetLicenseWithMachines).not.toHaveBeenCalled()
  })
})
