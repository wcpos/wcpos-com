import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const { loggerError, push } = vi.hoisted(() => ({
  loggerError: vi.fn(),
  push: vi.fn(),
}))

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
  CheckoutForm: ({
    amount,
    currency,
    onSuccess,
    onFailure,
  }: {
    amount: number
    currency: string
    onSuccess: (id: string) => void
    onFailure: (failure: unknown) => void
  }) => (
    <>
      <div data-testid="checkout-total">
        {amount} {currency}
      </div>
      <button data-testid="checkout-form" onClick={() => onSuccess('order_1')}>
        Pay
      </button>
      <button
        data-testid="fail-order-pending"
        onClick={() =>
          onFailure({
            kind: 'order_pending',
            message: 'Order pending',
            reference: 'WCPOS-TEST',
          })
        }
      >
        Fail
      </button>
    </>
  ),
}))

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: loggerError },
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
  window.sessionStorage.clear()
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
    expect(loggerError).toHaveBeenCalledWith('Renewal preparation failed', {
      error: expect.any(Error),
    })
  })

  it('does not report prep failures after unmount', async () => {
    let rejectCart: (error: Error) => void = () => {}
    mockFetch.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectCart = reject
      })
    )

    const { unmount } = render(<RenewClient {...props()} />)
    unmount()
    rejectCart(new Error('cart'))

    await Promise.resolve()
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('falls back to checkout when payment session omits the client secret', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ clientSecret: null }))

    render(<RenewClient {...props()} />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /checkout/i })).toBeTruthy()
    )
    expect(screen.queryByTestId('checkout-form')).toBeNull()
  })

  it('passes the prepared cart total into checkout', async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({ cart: { id: 'cart_1', total: 12900, currency_code: 'usd' } })
      )
      .mockResolvedValueOnce(
        okJson({ cart: { id: 'cart_1', total: 12900, currency_code: 'usd' } })
      )
      .mockResolvedValueOnce(
        okJson({ cart: { id: 'cart_1', total: 15480, currency_code: 'usd' } })
      )
      .mockResolvedValueOnce(
        okJson({
          cart: { id: 'cart_1', total: 15480, currency_code: 'usd' },
          clientSecret: 'cs_1',
        })
      )

    render(<RenewClient {...props({ amount: 129, currency: 'usd' })} />)

    await waitFor(() =>
      expect(screen.getByTestId('checkout-total').textContent).toBe('15480 usd')
    )
  })

  it('blocks a second payment attempt after an order-pending failure', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ cart: { id: 'cart_1' } }))
      .mockResolvedValueOnce(okJson({ clientSecret: 'cs_1' }))

    const { unmount } = render(<RenewClient {...props()} />)
    await waitFor(() => expect(screen.getByTestId('checkout-form')).toBeTruthy())

    fireEvent.click(screen.getByTestId('fail-order-pending'))

    expect(screen.getByTestId('renew-failure').textContent).toContain(
      'Order pending'
    )
    expect(screen.queryByTestId('checkout-form')).toBeNull()

    unmount()
    render(<RenewClient {...props()} />)

    expect(screen.getByTestId('renew-failure').textContent).toContain(
      'Order pending'
    )
    expect(screen.queryByTestId('checkout-form')).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })
})
