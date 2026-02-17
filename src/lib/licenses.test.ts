import { describe, expect, it } from 'vitest'
import type { MedusaOrder } from './medusa-auth'
import {
  extractLicenseIdsFromOrders,
  extractLicenseReferencesFromOrders,
} from './licenses'

function makeOrder(metadata: Record<string, unknown>): MedusaOrder {
  return {
    id: 'order_1',
    status: 'completed',
    display_id: 1,
    email: 'user@example.com',
    currency_code: 'usd',
    total: 129,
    subtotal: 129,
    tax_total: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    items: [],
    metadata,
  }
}

describe('extractLicenseIdsFromOrders', () => {
  it('extracts IDs from different metadata key formats', () => {
    const orders = [
      makeOrder({
        licenses: [
          { license_id: 'lic_old' },
          { licenseId: 'lic_camel' },
          { id: 'lic_id' },
        ],
      }),
    ]

    expect(extractLicenseIdsFromOrders(orders)).toEqual([
      'lic_old',
      'lic_camel',
      'lic_id',
    ])
  })

  it('ignores invalid entries and de-duplicates IDs', () => {
    const orders = [
      makeOrder({
        licenses: [
          { license_id: 'lic_dup' },
          { licenseId: 'lic_dup' },
          { random: 'value' },
        ],
      }),
    ]

    expect(extractLicenseIdsFromOrders(orders)).toEqual(['lic_dup'])
  })

  it('skips non-array license metadata safely', () => {
    const orders = [
      makeOrder({
        licenses: 'not-an-array',
      }),
    ]

    expect(extractLicenseIdsFromOrders(orders)).toEqual([])
  })
})

describe('extractLicenseReferencesFromOrders', () => {
  it('extracts references when metadata only includes license keys', () => {
    const orders = [
      makeOrder({
        licenses: [
          { license_key: 'WCPOS-AAAA-1111' },
          { licenseKey: 'WCPOS-BBBB-2222' },
          { key: 'WCPOS-CCCC-3333' },
        ],
      }),
    ]

    expect(extractLicenseReferencesFromOrders(orders)).toEqual([
      { key: 'WCPOS-AAAA-1111' },
      { key: 'WCPOS-BBBB-2222' },
      { key: 'WCPOS-CCCC-3333' },
    ])
  })

  it('extracts references from line item metadata and deduplicates by key', () => {
    const orders: MedusaOrder[] = [
      {
        ...makeOrder({}),
        items: [
          {
            id: 'item_1',
            title: 'WCPOS Pro',
            quantity: 1,
            unit_price: 129,
            total: 129,
            metadata: {
              license_key: 'WCPOS-AAAA-1111',
            },
          },
          {
            id: 'item_2',
            title: 'WCPOS Pro',
            quantity: 1,
            unit_price: 129,
            total: 129,
            metadata: {
              key: 'WCPOS-AAAA-1111',
            },
          },
        ],
      },
    ]

    expect(extractLicenseReferencesFromOrders(orders)).toEqual([
      { key: 'WCPOS-AAAA-1111' },
    ])
  })
})
