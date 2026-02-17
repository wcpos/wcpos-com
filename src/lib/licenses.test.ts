import { describe, expect, it } from 'vitest'
import type { MedusaOrder } from './medusa-auth'
import { extractLicenseIdsFromOrders } from './licenses'

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
})
