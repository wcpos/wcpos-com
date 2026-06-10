import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Set env vars BEFORE module import (isStripeEnabled is evaluated at module load)
// vi.hoisted runs before hoisted vi.mock calls
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123'
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID = 'paypal_test_client'
  process.env.NEXT_PUBLIC_BTCPAY_ENABLED = 'true'
})

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
// Mock the locale-aware Link as a simple anchor
vi.mock('@/i18n/navigation', () => ({
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

// Mock payment providers to avoid loading Stripe/PayPal SDKs
vi.mock('./stripe-provider', () => ({
  StripeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('./paypal-provider', () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('./checkout-form', () => ({
  CheckoutForm: ({
    onSuccess,
    onFailure,
  }: {
    onSuccess: (id: string) => void
    onFailure: (failure: unknown) => void
  }) => (
    <div>
      <button data-testid="mock-pay-button" onClick={() => onSuccess('order-abc-123')}>
        Pay
      </button>
      <button
        data-testid="mock-fail-button"
        onClick={() =>
          onFailure({
            kind: 'payment_failed',
            message:
              'Your card was declined. Please try a different card or payment method.',
            reference: 'WCPOS-TEST-FAIL',
          })
        }
      >
        Fail
      </button>
      <button
        data-testid="mock-pending-button"
        onClick={() =>
          onFailure({
            kind: 'order_pending',
            message:
              'Your payment was received, but we could not finish creating your order.',
            reference: 'WCPOS-TEST-PENDING',
          })
        }
      >
        Pending
      </button>
    </div>
  ),
}))

const renderPayPalButton = vi.fn()
const renderBTCPayButton = vi.fn()

vi.mock('./paypal-button', () => ({
  PayPalButton: (props: Record<string, unknown>) => {
    renderPayPalButton(props)
    return <div data-testid="paypal-button">PayPal</div>
  },
}))
vi.mock('./btcpay-button', () => ({
  BTCPayButton: (props: Record<string, unknown>) => {
    renderBTCPayButton(props)
    return <div data-testid="btcpay-button">BTCPay</div>
  },
}))

import { CheckoutClient } from './checkout-client'
import {
  persistPendingFailure,
  readPendingFailure,
} from './checkout-pending-storage'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function buildCheckoutCart({
  title = 'WCPOS Pro Lifetime',
  unitPrice = 129,
  itemTotal = 129,
  omitItemTotal = false,
  quantity = 1,
  cartTotal = 129,
  paymentSessions = [
    { provider_id: 'pp_stripe_stripe', data: { client_secret: 'pi_test_secret' } },
  ],
  legacyPaymentSessions,
  legacyPaymentSession,
}: {
  title?: string
  unitPrice?: number
  itemTotal?: number
  omitItemTotal?: boolean
  quantity?: number
  cartTotal?: number
  paymentSessions?: Array<{ provider_id: string; data: Record<string, unknown> }>
  legacyPaymentSessions?: Array<{ provider_id: string; data: Record<string, unknown> }>
  legacyPaymentSession?: { provider_id: string; data: Record<string, unknown> }
} = {}) {
  return {
    id: 'cart-123',
    items: [
      {
        id: 'item-1',
        title,
        quantity,
        unit_price: unitPrice,
        ...(omitItemTotal ? {} : { total: itemTotal }),
      },
    ],
    total: cartTotal,
    currency_code: 'usd',
    payment_collection: {
      id: 'pay-col-123',
      payment_sessions: paymentSessions,
    },
    ...(legacyPaymentSessions ? { payment_sessions: legacyPaymentSessions } : {}),
    ...(legacyPaymentSession ? { payment_session: legacyPaymentSession } : {}),
  }
}

function mockSuccessfulCheckoutInit(
  cart = buildCheckoutCart()
) {
  // 1. POST /api/store/cart
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cart: { id: 'cart-123' } }),
  })
  // 2. POST /api/store/cart/line-items
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cart }),
  })
  // 3. POST /api/store/cart/payment-sessions
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      cart,
      paymentCollectionId: 'pay-col-123',
      clientSecret: 'pi_test_secret',
    }),
  })
}

describe('CheckoutClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )
    expect(screen.getByText('Preparing checkout...')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('renders order summary after checkout initialization', async () => {
    mockSuccessfulCheckoutInit()
    // Extra call for PATCH email association
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument()
      expect(screen.getByText('WCPOS Pro Lifetime')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/store/cart/line-items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          cartId: 'cart-123',
          variant_id: 'variant-prop-123',
          quantity: 1,
        }),
      })
    )
  })

  it('shows "Back to pricing" link when cart creation fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      const backLink = screen.getByRole('link', { name: /back to pricing/i })
      expect(backLink).toHaveAttribute('href', '/pro')
    })
  })

  it('shows success state with "Go to Licenses" link after payment', async () => {
    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-pay-button'))

    await waitFor(() => {
      expect(screen.getByText('Thank you for your purchase!')).toBeInTheDocument()
      expect(screen.getByText('Order ID: order-abc-123')).toBeInTheDocument()
    })

    const licensesLink = screen.getByRole('link', { name: /go to licenses/i })
    expect(licensesLink).toHaveAttribute('href', '/account/licenses')
  })

  it('shows "Return to Home" link in success state', async () => {
    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-pay-button'))

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /return to home/i })
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })

  it('pre-fills email when customerEmail is provided', async () => {
    mockSuccessfulCheckoutInit()
    // Extra call for PATCH email association
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email address') as HTMLInputElement
      expect(emailInput.value).toBe('user@example.com')
      expect(emailInput).toHaveAttribute('readOnly')
    })
  })

  it('shows sign-in message when customerEmail is missing', async () => {
    render(<CheckoutClient experimentVariant="control" />)

    await waitFor(() => {
      expect(
        screen.getByText('Please sign in to continue checkout.')
      ).toBeInTheDocument()
    })
  })

  it('falls back to unit price when Medusa omits line item total', async () => {
    mockSuccessfulCheckoutInit(
      buildCheckoutCart({
        title: 'WCPOS Pro Lifetime',
        unitPrice: 399,
        omitItemTotal: true,
        cartTotal: 399,
      })
    )
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('WCPOS Pro Lifetime')).toBeInTheDocument()
      expect(screen.queryByText('$NaN')).not.toBeInTheDocument()
    })
  })

  it('passes paypal session order id to PayPalButton when present in cart sessions', async () => {
    mockSuccessfulCheckoutInit(
      buildCheckoutCart({
        paymentSessions: [
          { provider_id: 'pp_stripe_stripe', data: { client_secret: 'pi_test_secret' } },
          { provider_id: 'pp_paypal_paypal', data: { id: 'PAYPAL_ORDER_123' } },
        ],
      })
    )
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(renderPayPalButton).toHaveBeenCalledWith(
        expect.objectContaining({
          paypalOrderId: 'PAYPAL_ORDER_123',
        })
      )
    })
  })

  it('falls back to legacy cart payment sessions when collection lacks paypal session', async () => {
    mockSuccessfulCheckoutInit(
      buildCheckoutCart({
        paymentSessions: [
          { provider_id: 'pp_stripe_stripe', data: { client_secret: 'pi_test_secret' } },
        ],
        legacyPaymentSessions: [
          { provider_id: 'pp_paypal_paypal', data: { id: 'PAYPAL_ORDER_FALLBACK' } },
        ],
      })
    )
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(renderPayPalButton).toHaveBeenCalledWith(
        expect.objectContaining({
          paypalOrderId: 'PAYPAL_ORDER_FALLBACK',
        })
      )
    })
  })

  it('shows the recovery notice and preserves the cart when payment fails', async () => {
    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-fail-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-fail-button'))

    await waitFor(() => {
      expect(screen.getByText('Payment unsuccessful')).toBeInTheDocument()
    })

    // Mapped, customer-safe message with a support reference
    expect(
      screen.getByText(
        'Your card was declined. Please try a different card or payment method.'
      )
    ).toBeInTheDocument()
    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute('href', '/support?ref=WCPOS-TEST-FAIL')

    // Multiple methods are enabled, so the switch-method hint shows
    expect(
      screen.getByText(/choose a different payment method/i)
    ).toBeInTheDocument()

    // The cart, email and payment form all stay mounted for retry
    expect(screen.getByText('Order Summary')).toBeInTheDocument()
    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement
    expect(emailInput.value).toBe('user@example.com')
    expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
  })

  it('shows the distinct order-pending state when completion fails after payment', async () => {
    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-pending-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-pending-button'))

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })

    // The customer is told not to pay again, with a support reference
    expect(screen.getByText(/do not pay again/i)).toBeInTheDocument()
    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute('href', '/support?ref=WCPOS-TEST-PENDING')
    expect(screen.getByText('WCPOS-TEST-PENDING')).toBeInTheDocument()

    // The payment form is gone — no way to pay a second time
    expect(screen.queryByText('Order Summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-pay-button')).not.toBeInTheDocument()
    expect(screen.queryByText('Payment unsuccessful')).not.toBeInTheDocument()
  })

  it('persists the order-pending failure so a reload cannot re-enable payment', async () => {
    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-pending-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-pending-button'))

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })

    const persisted = readPendingFailure()
    expect(persisted).toEqual({
      cartId: 'cart-123',
      failure: expect.objectContaining({
        kind: 'order_pending',
        reference: 'WCPOS-TEST-PENDING',
      }),
    })
  })

  it('does not persist plain payment failures', async () => {
    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-fail-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-fail-button'))

    await waitFor(() => {
      expect(screen.getByText('Payment unsuccessful')).toBeInTheDocument()
    })

    expect(readPendingFailure()).toBeNull()
  })

  it('restores the order-pending state on reload without creating a new cart', async () => {
    persistPendingFailure('cart-old', {
      kind: 'order_pending',
      message:
        'Your payment was received, but we could not finish creating your order.',
      reference: 'WCPOS-RESTORED-PENDING',
    })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })

    // The protective copy and the persisted reference both survive the reload
    expect(screen.getByText(/do not pay again/i)).toBeInTheDocument()
    expect(screen.getByText('WCPOS-RESTORED-PENDING')).toBeInTheDocument()

    // No new cart or payment session is created — the customer cannot pay again
    expect(mockFetch).not.toHaveBeenCalled()
    expect(screen.queryByText('Order Summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-pay-button')).not.toBeInTheDocument()
  })

  it('restores the uncertain-payment warning on reload while keeping checkout mounted', async () => {
    persistPendingFailure('cart-old', {
      kind: 'payment_uncertain',
      message:
        "We couldn't confirm the status of your payment. If you think you may have been charged, please contact support before trying again.",
      reference: 'WCPOS-RESTORED-UNCERTAIN',
    })

    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Payment status unknown')).toBeInTheDocument()
    })

    expect(screen.getByText('WCPOS-RESTORED-UNCERTAIN')).toBeInTheDocument()

    // The checkout itself still mounts (the warning withholds retry guidance,
    // but support may confirm the charge failed, so the form stays usable)
    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument()
    })
  })

  it('clears the persisted protective state after a successful order', async () => {
    persistPendingFailure('cart-old', {
      kind: 'payment_uncertain',
      message: "We couldn't confirm the status of your payment.",
      reference: 'WCPOS-RESTORED-UNCERTAIN',
    })

    mockSuccessfulCheckoutInit()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('mock-pay-button'))

    await waitFor(() => {
      expect(screen.getByText('Thank you for your purchase!')).toBeInTheDocument()
    })

    expect(readPendingFailure()).toBeNull()
  })

  it('passes BTCPay checkout link to BTCPayButton when present in cart sessions', async () => {
    mockSuccessfulCheckoutInit(
      buildCheckoutCart({
        paymentSessions: [
          { provider_id: 'pp_stripe_stripe', data: { client_secret: 'pi_test_secret' } },
          {
            provider_id: 'pp_btcpay_btcpay',
            data: { checkoutLink: 'https://btcpay.wcpos.com/i/invoice_123' },
          },
        ],
      })
    )
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(
      <CheckoutClient
        customerEmail="user@example.com"
        selectedVariantId="variant-prop-123"
        experimentVariant="control"
      />
    )

    await waitFor(() => {
      expect(renderBTCPayButton).toHaveBeenCalledWith(
        expect.objectContaining({
          checkoutLink: 'https://btcpay.wcpos.com/i/invoice_123',
        })
      )
    })
  })
})
