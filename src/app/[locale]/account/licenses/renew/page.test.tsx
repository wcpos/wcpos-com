import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockRedirect,
  mockGetCustomer,
  mockGetRequestStoreEnvironment,
} = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
  mockGetCustomer: vi.fn(async () => ({
    first_name: 'Ada',
    last_name: 'Lovelace',
    addresses: [
      {
        id: 'addr_partial',
        first_name: null,
        last_name: null,
        address_1: '42 Wallaby Way',
        city: 'Sydney',
        country_code: null,
        is_default_billing: true,
      },
    ],
  })),
  mockGetRequestStoreEnvironment: vi.fn(async () => ({
    payments: { stripePublishableKey: 'pk_test' },
  })),
}))

vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}))
vi.mock('@/i18n/navigation', () => ({
  Link: () => null,
  redirect: mockRedirect,
}))
vi.mock('@/components/account/renew-client', () => ({
  RenewClient: () => null,
}))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }))
vi.mock('@/lib/medusa-auth', () => ({ getCustomer: mockGetCustomer }))
vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: vi.fn(async () => ({
    licenses: [{ policyId: 'policy_yearly', expiry: '2027-01-01' }],
  })),
}))
vi.mock('@/lib/license', () => ({
  getLicenseDisplayStatus: vi.fn(() => 'active'),
}))
vi.mock('@/lib/plans', () => ({
  YEARLY_PRO_HANDLE: 'wcpos-pro-yearly',
  getPlanByPolicyId: vi.fn(() => ({ handle: 'wcpos-pro-yearly' })),
}))
vi.mock('@/lib/store-environment', () => ({
  getRequestStoreEnvironment: mockGetRequestStoreEnvironment,
}))
vi.mock('@/services/core/external/medusa-client', () => ({
  getCartPaymentProviderContext: vi.fn(async () => ({
    cartRegionId: 'reg_1',
  })),
}))
vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(async () => ({
    offers: [
      {
        handle: 'wcpos-pro-yearly',
        title: 'WCPOS Pro — Yearly',
        price: {
          amount: 129,
          currencyCode: 'usd',
          formatted: '$129.00',
        },
      },
    ],
  })),
}))

import { RenewContent } from './page'

describe('RenewContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects a partial saved address without an actual country to full checkout', async () => {
    const result = await RenewContent({ locale: 'en' })

    expect(mockRedirect).toHaveBeenCalledWith({
      href: '/pro/checkout?product=wcpos-pro-yearly',
      locale: 'en',
    })
    expect(mockGetRequestStoreEnvironment).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
