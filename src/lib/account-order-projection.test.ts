import { describe, expect, it, vi } from 'vitest'
import type { MedusaOrder } from './customer-orders'
import type { LicenseDetail } from '@/types/license'
import {
  projectAccountOrderDetail,
  projectAccountOrderListRow,
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

    vi.doUnmock('./licenses')
    vi.resetModules()
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
})

describe('receipt projections', () => {
  it('whitelists account profile metadata for receipts', () => {
    expect(
      projectReceiptProfile({
        account_profile: {
          countryCode: 'AU',
          addressLine1: '1 Market St',
          addressLine2: 'Suite 2',
          city: 'Sydney',
          region: 'NSW',
          postalCode: '2000',
          taxNumber: 'ABN 123',
          avatarDataUrl: 'data:image/png;base64,secret',
        },
        discord_user_id: 'not-for-receipt',
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

  it('projects receipt facts from an order and billing profile', () => {
    const profile = projectReceiptProfile({ account_profile: { city: 'Sydney' } })

    expect(projectAccountOrderReceipt(makeOrder(), profile)).toEqual({
      displayId: 1001,
      createdAt: '2026-02-01T00:00:00Z',
      customerEmail: 'buyer@example.com',
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
})
