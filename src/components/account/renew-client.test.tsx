import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const push = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Stub the Stripe layers — we're testing the renewal orchestration, not Stripe.
vi.mock('@/components/pro/stripe-provider', () => ({
  StripeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-provider">{children}</div>
  ),
}))

vi.mock('@/components/pro/checkout-form', () => ({
  CheckoutForm: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <button data-testid="checkout-form" onClick={() => onSuccess('order_1')}>
      Pay
    </button>
  ),
}))

import { RenewClient } from './renew-client'

const BILLING = {
  first_name: 'A',
  last_name: 'B',
  address_1: '1 St',
  city: 'Town',
  province: 'CA',
  postal_code: '90001',
  country_code: 'us',
}

function props(overrides = {}) {
  return {
    regionId: 'reg_1',
    offerHandle: 'wcpos-pro-yearly',
    billingAddress: BILLING as never,
    amount: 129,
    currency: 'usd',
    priceFormatted: '$129.00',
    productTitle: 'WCPOS Pro — Yearly',
    stripePublishableKey: 'pk_test_x',
    ...overrides,
  }
}

function okJson(body: unknown) {
  return { ok: true, json: async () => body }
}

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
})

describe('RenewClient', () => {
  it('preps the cart via the existing routes, then renders the payment form', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } })) // POST /cart
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } })) // line-items
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } })) // PATCH billing
      .mockResolvedValueOnce(
        okJson({ clientSecret: 'cs_1', customerSessionClientSecret: 'cuss_1' })
      ) // payment-sessions

    render(<RenewClient {...props()} />)

    await waitFor(() =>
      expect(screen.getByTestId('checkout-form')).toBeTruthy()
    )

    const calls = mockFetch.mock.calls.map((c) => [c[0], c[1]?.method])
    expect(calls).toEqual([
      ['/api/store/cart', 'POST'],
      ['/api/store/cart/line-items', 'POST'],
      ['/api/store/cart', 'PATCH'],
      ['/api/store/cart/payment-sessions', 'POST'],
    ])

    // Cart is created with the resolved (USD) region and the yearly offer.
    const cartBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(cartBody.region_id).toBe('reg_1')
    const itemBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(itemBody.product).toBe('wcpos-pro-yearly')
  })

  it('redirects to the licenses page on successful payment', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ clientSecret: 'cs_1' }))

    render(<RenewClient {...props()} />)
    await waitFor(() => expect(screen.getByTestId('checkout-form')).toBeTruthy())

    fireEvent.click(screen.getByTestId('checkout-form'))
    expect(push).toHaveBeenCalledWith('/account/licenses?renewed=1')
  })

  it('falls back to the full checkout when cart prep fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    render(<RenewClient {...props()} />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /checkout/i })).toBeTruthy()
    )
    expect(
      screen
        .getByRole('link', { name: /checkout/i })
        .getAttribute('href')
    ).toBe('/pro/checkout?product=wcpos-pro-yearly')
    expect(screen.queryByTestId('checkout-form')).toBeNull()
  })
})
