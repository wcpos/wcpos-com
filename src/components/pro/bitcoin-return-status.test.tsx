import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { BitcoinReturnStatus } from './bitcoin-return-status'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockReplace = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string | { pathname: string; query?: Record<string, string> }
    [key: string]: unknown
  }) => {
    const resolved =
      typeof href === 'string'
        ? href
        : href.query
          ? `${href.pathname}?${new URLSearchParams(href.query)}`
          : href.pathname

    return (
      <a href={resolved} {...props}>
        {children}
      </a>
    )
  },
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}))

function statusResponse(
  state: string,
  checkoutLink: string | null = null,
  variantId: string | null = 'variant_yearly'
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ state, checkoutLink, variantId }),
  }
}

describe('BitcoinReturnStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards to the success page once the cart has become an order', async () => {
    mockFetch.mockResolvedValue(statusResponse('completed'))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/pro/checkout/success')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/store/cart/payment-status?cartId=cart_1'
    )
  })

  it('shows the confirming state while the network settles the payment', async () => {
    mockFetch.mockResolvedValue(statusResponse('confirming'))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    expect(await screen.findByText('Payment received')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('offers to reopen the invoice while it is unpaid', async () => {
    mockFetch.mockResolvedValue(
      statusResponse('awaiting_payment', 'https://btcpay.example/i/inv_1')
    )

    render(<BitcoinReturnStatus cartId="cart_1" />)

    const reopen = await screen.findByRole('link', {
      name: 'Reopen Bitcoin invoice',
    })
    expect(reopen).toHaveAttribute('href', 'https://btcpay.example/i/inv_1')
    // Checkout needs the variant, or it renders "no product selected".
    expect(screen.getByRole('link', { name: 'Back to checkout' })).toHaveAttribute(
      'href',
      '/pro/checkout?variant=variant_yearly'
    )
  })

  it('sends expired invoices back to checkout without asserting non-payment', async () => {
    mockFetch.mockResolvedValue(statusResponse('expired'))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    expect(await screen.findByText('Invoice expired')).toBeInTheDocument()
    // Honest under webhook lag: paid-before-expiry still completes.
    expect(
      screen.getByText(/If you paid before it expired/)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to checkout' })).toHaveAttribute(
      'href',
      '/pro/checkout?variant=variant_yearly'
    )
  })

  it('falls back to pricing when the cart holds no resumable variant', async () => {
    mockFetch.mockResolvedValue(statusResponse('expired', null, null))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    // A bare /pro/checkout is a "no product selected" dead end.
    expect(
      await screen.findByRole('link', { name: 'Back to pricing' })
    ).toHaveAttribute('href', '/pro')
    expect(
      screen.queryByRole('link', { name: 'Back to checkout' })
    ).not.toBeInTheDocument()
  })

  it('never claims an invalid invoice went unpaid', async () => {
    mockFetch.mockResolvedValue(statusResponse('payment_issue'))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    expect(
      await screen.findByText("We couldn't confirm your payment")
    ).toBeInTheDocument()
    // BTCPay marks invoices invalid when money arrived but failed to confirm.
    expect(screen.getByText(/don't send it again/)).toBeInTheDocument()
    expect(screen.queryByText('Invoice expired')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'View your orders' })
    ).toBeInTheDocument()
  })

  it('keeps polling after an invalid invoice so a manual settle still wins', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(statusResponse('payment_issue'))
        .mockResolvedValue(statusResponse('completed'))

      render(<BitcoinReturnStatus cartId="cart_1" />)

      await vi.waitFor(() =>
        expect(
          screen.getByText("We couldn't confirm your payment")
        ).toBeInTheDocument()
      )

      await vi.advanceTimersByTimeAsync(5000)

      await vi.waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith('/pro/checkout/success')
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps polling after expired so a racing completion still wins', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(statusResponse('expired'))
        .mockResolvedValue(statusResponse('completed'))

      render(<BitcoinReturnStatus cartId="cart_1" />)

      await vi.waitFor(() =>
        expect(screen.getByText('Invoice expired')).toBeInTheDocument()
      )

      await vi.advanceTimersByTimeAsync(5000)

      await vi.waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith('/pro/checkout/success')
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('holds the neutral checking state on inconclusive invoice data', async () => {
    mockFetch.mockResolvedValue(statusResponse('unknown'))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    expect(await screen.findByText('Checking your payment…')).toBeInTheDocument()
    expect(screen.queryByText("We couldn't check your payment")).not.toBeInTheDocument()
  })

  it('asks the customer to sign in when the session is gone', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })

    render(<BitcoinReturnStatus cartId="cart_1" />)

    expect(
      await screen.findByRole('link', { name: 'Sign in' })
    ).toBeInTheDocument()
  })

  it('shows a calm error state when the status check fails', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    render(<BitcoinReturnStatus cartId="cart_1" />)

    expect(
      await screen.findByText("We couldn't check your payment")
    ).toBeInTheDocument()
    // The customer may already have paid — never imply the order is lost.
    expect(screen.getByText(/arrive automatically/)).toBeInTheDocument()
  })
})
