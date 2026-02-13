import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Set env vars BEFORE module import (isStripeEnabled is evaluated at module load)
// vi.hoisted runs before hoisted vi.mock calls
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123'
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'variant' ? 'variant-123' : null),
  }),
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
vi.mock('./paypal-button', () => ({
  PayPalButton: () => <div data-testid="paypal-button">PayPal</div>,
}))
vi.mock('./btcpay-button', () => ({
  BTCPayButton: () => <div data-testid="btcpay-button">BTCPay</div>,
}))

import { CheckoutClient } from './checkout-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockSuccessfulCheckoutInit() {
  // 1. POST /api/store/cart
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cart: { id: 'cart-123' } }),
  })
  // 2. POST /api/store/cart/line-items
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      cart: {
        id: 'cart-123',
        items: [{ id: 'item-1', title: 'WooCommerce POS Pro', quantity: 1, unit_price: 129, total: 129 }],
        total: 129,
        currency_code: 'usd',
      },
    }),
  })
  // 3. POST /api/store/cart/payment-sessions
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      cart: {
        id: 'cart-123',
        items: [{ id: 'item-1', title: 'WooCommerce POS Pro', quantity: 1, unit_price: 129, total: 129 }],
        total: 129,
        currency_code: 'usd',
      },
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
    render(<CheckoutClient />)
    expect(screen.getByText('Preparing checkout...')).toBeInTheDocument()
  })

  it('renders order summary after checkout initialization', async () => {
    mockSuccessfulCheckoutInit()
    render(<CheckoutClient />)

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument()
      expect(screen.getByText('WooCommerce POS Pro')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
    })
  })

  it('shows "Back to pricing" link when cart creation fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<CheckoutClient />)

    await waitFor(() => {
      const backLink = screen.getByRole('link', { name: /back to pricing/i })
      expect(backLink).toHaveAttribute('href', '/pro')
    })
  })

  it('shows success state with "Go to Licenses" link after payment', async () => {
    mockSuccessfulCheckoutInit()
    render(<CheckoutClient />)

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
    render(<CheckoutClient />)

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
    // Extra call for PATCH email association (fire-and-forget)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(<CheckoutClient customerEmail="user@example.com" />)

    await waitFor(() => {
      const emailInput = screen.getByLabelText('Email address') as HTMLInputElement
      expect(emailInput.value).toBe('user@example.com')
      expect(emailInput).toHaveAttribute('readOnly')
    })
  })
})
