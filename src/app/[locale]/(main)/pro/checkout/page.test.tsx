import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockConnection } = vi.hoisted(() => ({
  mockConnection: vi.fn(async () => {}),
}))

vi.mock('next/server', () => ({
  connection: mockConnection,
}))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn() })),
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: vi.fn(async () => null),
}))

vi.mock('@/lib/store-environment', () => ({
  getRequestStoreEnvironment: vi.fn(async () => ({
    name: 'dev',
    medusaBackendUrl: 'http://127.0.0.1:4873',
    medusaPublishableKey: 'pk_test',
    payments: {
      stripePublishableKey: null,
      paypalClientId: null,
      btcpayEnabled: true,
    },
  })),
}))

vi.mock('@/lib/analytics/config', () => ({
  getAnalyticsConfig: vi.fn(() => ({ enabled: false })),
}))

vi.mock('@/services/core/analytics/posthog-service', () => ({
  resolveProCheckoutVariant: vi.fn(async () => 'control'),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  getCartPaymentProviderContext: vi.fn(async () => ({
    cartRegionId: 'reg_test',
    providerIds: ['pp_btcpay_btcpay'],
  })),
}))

vi.mock('@/lib/checkout-payments', () => ({
  filterPaymentsByBackendProviders: vi.fn((payments) => payments),
}))

vi.mock('@/lib/pro-offer-catalog', () => ({
  getProOfferCatalog: vi.fn(async () => ({
    offers: [
      {
        handle: 'wcpos-pro-yearly',
        planId: 'yearly',
        price: { formatted: '$129.00' },
      },
    ],
  })),
  resolveProOfferCheckoutSelection: vi.fn(() => ({
    handle: 'wcpos-pro-yearly',
  })),
}))

vi.mock('@/lib/billing-profile', () => ({
  billingPrefillFromCustomer: vi.fn(() => ({
    address: null,
    taxNumber: undefined,
  })),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/components/pro/checkout-client', () => ({
  CheckoutClient: () => <div data-testid="checkout-client" />,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
}))

import { CheckoutContent } from './page'

describe('CheckoutContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('waits for the incoming request before resolving auth-sensitive checkout UI', async () => {
    await CheckoutContent({
      searchParamsPromise: Promise.resolve({ product: 'wcpos-pro-yearly' }),
    })

    expect(mockConnection).toHaveBeenCalledTimes(1)
  })
})
