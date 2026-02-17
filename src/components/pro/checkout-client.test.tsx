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
// Mock next/link as a simple anchor
vi.mock('next/link', () => ({
  default: ({
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
  CheckoutForm: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <button data-testid="mock-pay-button" onClick={() => onSuccess('order-abc-123')}>
      Pay
    </button>
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
