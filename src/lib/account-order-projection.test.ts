import { describe, expect, it, vi } from 'vitest'
import type { MedusaOrder } from './customer-orders'
import type { LicenseDetail } from '@/types/license'
import {
  projectAccountOrderDetail,
  projectAccountOrderListRow,
  projectAccountOrderListRows,
  projectAccountOrderReceipt,
  projectReceiptProfile,
} from './account-order-projection'

function makeOrder(overrides: Partial<MedusaOrder> = {}): MedusaOrder {
  return {
    id: 'order_1',
    status: 'completed',
    payment_status: 'captured',
    display_id: 1001,
    email: 'buyer@example.com',
    currency_code: 'usd',
    total: 129,
    subtotal: 120,
    tax_total: 9,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    items: [
      {
        id: 'item_1',
        title: 'WCPOS Pro Yearly',
        quantity: 1,
        unit_price: 129,
        total: 129,
        metadata: {
          license_id: 'lic_1',
          license_key: 'WCPOS-YEAR-LIC1-1234',
        },
      },
    ],
    metadata: {},
    ...overrides,
  }
}

function makeLicense(overrides: Partial<LicenseDetail> = {}): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-YEAR-LIC1-1234',
    status: 'active',
    expiry: '2027-02-01T00:00:00Z',
    maxMachines: 1,
    activationCount: 0,
    machines: [],
    metadata: {},
    policyId: 'pol_yearly',
    createdAt: '2026-02-01T00:00:00Z',
    ...overrides,
  }
}

describe('projectAccountOrderListRow', () => {
  it('retains key data when duplicate references share an id', async () => {
    vi.resetModules()
    try {
      vi.doMock('./licenses', async (importOriginal) => {
        const actual = await importOriginal<typeof import('./licenses')>()
        return {
          ...actual,
          extractLicenseReferencesFromOrders: () => [
            { id: 'lic_1', key: 'WCPOS-YEAR-LIC1-1234' },
            { id: 'lic_1' },
          ],
        }
      })
      const { projectAccountOrderListRow } = await import(
        './account-order-projection'
      )

      const row = projectAccountOrderListRow(makeOrder())

      expect(row.licenses).toEqual([
        { maskedKey: '****-****-1234', product: 'WCPOS Pro Yearly' },
      ])
    } finally {
      vi.doUnmock('./licenses')
      vi.resetModules()
    }
  })

  it('masks and deduplicates license references before returning a client-safe row', () => {
    const order = makeOrder({
      metadata: {
        licenses: [
          { license_id: 'lic_1', license_key: 'WCPOS-YEAR-LIC1-1234' },
          { licenseId: 'lic_1', licenseKey: 'WCPOS-YEAR-LIC1-1234' },
        ],
      },
    })

    expect(projectAccountOrderListRow(order)).toEqual({
      id: 'order_1',
      displayId: 1001,
      createdAt: '2026-02-01T00:00:00Z',
      itemCount: 1,
      displayStatus: 'Paid',
      total: { amount: 129, currencyCode: 'usd' },
      licenses: [
        {
          maskedKey: '****-****-1234',
          product: 'WCPOS Pro Yearly',
        },
      ],
    })
  })

  it('does not attribute a product when the order has multiple line items', () => {
    const row = projectAccountOrderListRow(
      makeOrder({
        items: [
          {
            id: 'item_1',
            title: 'WCPOS Pro Yearly',
            quantity: 1,
            unit_price: 129,
            total: 129,
            metadata: { license_key: 'WCPOS-YEAR-LIC1-1234' },
          },
          {
            id: 'item_2',
            title: 'Setup Call',
            quantity: 1,
            unit_price: 50,
            total: 50,
          },
        ],
      })
    )

    expect(row.licenses).toEqual([{ maskedKey: '****-****-1234' }])
  })

  it('uses legacy WooCommerce metadata for migrated order identity', () => {
    const row = projectAccountOrderListRow(
      makeOrder({
        display_id: 1930,
        created_at: '2026-02-23T19:24:40.000Z',
        metadata: {
          wc_order_id: 19524,
          wc_order_date: '2019-08-16 16:38:12',
          wc_order_date_gmt: '2019-08-16 08:38:12',
        },
      })
    )

    expect(row.displayId).toBe(1930)
    expect(row.legacyDisplayId).toBe(19524)
    expect(row.createdAt).toBe('2019-08-16T08:38:12Z')
  })
})

describe('projectAccountOrderListRows', () => {
  it('sorts migrated orders by projected WooCommerce date newest first', () => {
    const rows = projectAccountOrderListRows([
      makeOrder({
        id: 'order_2019',
        display_id: 2860,
        metadata: {
          wc_order_id: 19524,
          wc_order_date: '2019-08-16 16:38:12',
        },
      }),
      makeOrder({
        id: 'order_2026',
        display_id: 4000,
        metadata: {
          wc_order_id: 39509,
          wc_order_date: '2026-03-17 05:47:31',
        },
      }),
      makeOrder({
        id: 'order_2021',
        display_id: 3493,
        metadata: {
          wc_order_id: 31343,
          wc_order_date: '2021-04-09 22:53:06',
        },
      }),
    ])

    expect(rows.map((row) => row.displayId)).toEqual([4000, 3493, 2860])
    expect(rows.map((row) => row.legacyDisplayId)).toEqual([
      39509,
      31343,
      19524,
    ])
  })
})

describe('projectAccountOrderDetail', () => {
  it('keeps entitlement keys masked and exposes only id-anchored activation keys', () => {
    const detail = projectAccountOrderDetail(
      makeOrder({
        metadata: {
          licenses: [
            { license_id: 'lic_1', license_key: 'WCPOS-YEAR-LIC1-1234' },
            { license_key: 'WCPOS-LEGACY-KEY2-5678' },
          ],
        },
      }),
      [makeLicense()],
      new Date('2026-06-17T00:00:00Z').getTime()
    )

    expect(detail.licenseEntitlements).toEqual([
      {
        id: 'lic_1',
        maskedKey: '****-****-1234',
        status: 'active',
        product: 'WCPOS Pro Yearly',
      },
    ])
    expect(detail.activationKeys).toEqual([
      { id: 'lic_1', key: 'WCPOS-YEAR-LIC1-1234' },
    ])
  })

  it('projects item and money facts without formatting them for React', () => {
    const detail = projectAccountOrderDetail(makeOrder(), [], 0)

    expect(detail).toMatchObject({
      id: 'order_1',
      displayId: 1001,
      createdAt: '2026-02-01T00:00:00Z',
      email: 'buyer@example.com',
      displayStatus: 'Paid',
      total: { amount: 129, currencyCode: 'usd' },
      items: [
        {
          id: 'item_1',
          title: 'WCPOS Pro Yearly',
          quantity: 1,
          total: { amount: 129, currencyCode: 'usd' },
        },
      ],
    })
  })

  it('uses legacy WooCommerce metadata for migrated order detail identity', () => {
    const detail = projectAccountOrderDetail(
      makeOrder({
        display_id: 2860,
        created_at: '2026-02-23T19:24:40.000Z',
        metadata: {
          wc_order_id: '31343',
          wc_order_date: '2021-04-09T14:53:06.000Z',
        },
      }),
      [],
      0
    )

    expect(detail.displayId).toBe(2860)
    expect(detail.legacyDisplayId).toBe(31343)
    expect(detail.createdAt).toBe('2021-04-09T14:53:06.000Z')
  })
})

describe('receipt projections', () => {
  it('projects the default billing address for receipts', () => {
    expect(
      projectReceiptProfile({
        addresses: [
          { id: 'caddr_0', city: 'Elsewhere' },
          {
            id: 'caddr_1',
            country_code: 'au',
            address_1: '1 Market St',
            address_2: 'Suite 2',
            city: 'Sydney',
            province: 'NSW',
            postal_code: '2000',
            is_default_billing: true,
            metadata: { tax_number: 'ABN 123' },
          },
        ],
      })
    ).toEqual({
      countryCode: 'AU',
      addressLine1: '1 Market St',
      addressLine2: 'Suite 2',
      city: 'Sydney',
      region: 'NSW',
      postalCode: '2000',
      taxNumber: 'ABN 123',
    })
  })

  it('projects all-null billing fields for a customer without addresses', () => {
    expect(projectReceiptProfile(null)).toEqual({
      countryCode: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      taxNumber: null,
    })
  })

  it('projects receipt facts from an order and billing profile', () => {
    const profile = projectReceiptProfile({
      addresses: [{ id: 'caddr_1', city: 'Sydney', is_default_billing: true }],
    })

    expect(projectAccountOrderReceipt(makeOrder(), profile)).toEqual({
      displayId: 1001,
      createdAt: '2026-02-01T00:00:00Z',
      customerEmail: 'buyer@example.com',
      customerName: null,
      paymentStatus: 'captured',
      currencyCode: 'usd',
      billingProfile: {
        countryCode: null,
        addressLine1: null,
        addressLine2: null,
        city: 'Sydney',
        region: null,
        postalCode: null,
        taxNumber: null,
      },
      items: [
        {
          title: 'WCPOS Pro Yearly',
          quantity: 1,
          unitPrice: 129,
          total: 129,
        },
      ],
      totals: {
        subtotal: 120,
        tax: 9,
        total: 129,
      },
    })
  })

  it('projects the billing name from the customer record', () => {
    const profile = projectReceiptProfile(undefined)

    expect(
      projectAccountOrderReceipt(makeOrder(), profile, {
        first_name: '  Paul ',
        last_name: 'Kilmurray',
      }).customerName
    ).toBe('Paul Kilmurray')
    expect(
      projectAccountOrderReceipt(makeOrder(), profile, { first_name: '  ' })
        .customerName
    ).toBeNull()
  })

  it('uses legacy WooCommerce metadata for receipt identity', () => {
    const profile = projectReceiptProfile(undefined)

    expect(
      projectAccountOrderReceipt(
        makeOrder({
          display_id: 3493,
          created_at: '2026-02-23T19:24:40.000Z',
          metadata: {
            wc_order_id: 39509,
            wc_order_date: '2026-03-16T21:47:31.000Z',
          },
        }),
        profile
      )
    ).toMatchObject({
      displayId: 3493,
      legacyDisplayId: 39509,
      createdAt: '2026-03-16T21:47:31.000Z',
    })
  })
})
