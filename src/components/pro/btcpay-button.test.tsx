import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import type { BtcpayModalEvent } from '@/lib/btcpay-modal'
import { BTCPayButton } from './btcpay-button'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockPush = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}))

const mockOpenBtcpayModal = vi.fn()
vi.mock('@/lib/btcpay-modal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/btcpay-modal')>()
  return {
    ...actual,
    openBtcpayModal: (...args: unknown[]) => mockOpenBtcpayModal(...args),
  }
})

const CHECKOUT_LINK = 'https://btcpay.wcpos.com/i/inv_test1'

function sessionResponse() {
  return {
    ok: true,
    json: async () => ({
      cart: {
        payment_collection: {
          payment_sessions: [
            {
              provider_id: 'pp_btcpay_btcpay',
              data: {
                checkoutLink: CHECKOUT_LINK,
                btc_invoice: { id: 'inv_test1', checkoutLink: CHECKOUT_LINK },
              },
            },
          ],
        },
      },
    }),
  }
}

/** Routes fetch by endpoint: session creation POST vs the close-time
 * payment-status check. */
function routeFetch({ statusState = 'awaiting_payment' }: { statusState?: string } = {}) {
  mockFetch.mockImplementation(async (url: string) => {
    if (String(url).includes('/api/store/cart/payment-status')) {
      return { ok: true, json: async () => ({ state: statusState }) }
    }
    return sessionResponse()
  })
}

/** Captures the modal event callback so tests can drive checkout events. */
function modalOpensAndCaptures(): { emit: (e: BtcpayModalEvent) => void } {
  const captured: { emit: (e: BtcpayModalEvent) => void } = { emit: () => {} }
  mockOpenBtcpayModal.mockImplementation(
    async (
      _origin: string,
      _invoiceId: string,
      onEvent: (e: BtcpayModalEvent) => void
    ) => {
      captured.emit = onEvent
    }
  )
  return captured
}

/** Stands in for the global btcpay.js installs, so the component can take the
 * fullscreen frame down. */
function stubBtcpayGlobal() {
  const hideFrame = vi.fn()
  window.btcpay = {
    hideFrame,
    showInvoice: vi.fn(),
    onModalReceiveMessage: vi.fn(),
    onModalWillLeave: vi.fn(),
  }
  return hideFrame
}

describe('BTCPayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    delete window.btcpay
  })

  it('shows non-spinner loading state while preparing checkout', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    expect(
      screen.getByRole('button', { name: 'Preparing Bitcoin payment...' })
    ).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('reports a customer-safe retryable failure when initialization fails', async () => {
    const onFailure = vi.fn()
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    render(<BTCPayButton cartId="cart_1" onFailure={onFailure} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(2))

    // First call clears any previous failure, second reports the new one.
    expect(onFailure).toHaveBeenNthCalledWith(1, null)
    const failure = onFailure.mock.calls[1][0]
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).toContain('have not been charged')
    expect(failure.reference).toMatch(/^WCPOS-/)
  })

  it('re-enables the button after a failure so the customer can retry', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Pay with Bitcoin' })
      ).not.toBeDisabled()
    )
  })

  it('opens the modal in-page instead of redirecting', async () => {
    mockFetch.mockResolvedValue(sessionResponse())
    modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() =>
      expect(mockOpenBtcpayModal).toHaveBeenCalledWith(
        'https://btcpay.wcpos.com',
        'inv_test1',
        expect.any(Function)
      )
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('hands over to /processing when the modal reports payment', async () => {
    mockFetch.mockResolvedValue(sessionResponse())
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalled())

    modal.emit({ kind: 'status', invoiceId: 'inv_test1', status: 'Processing' })
    // The follow-up close must not navigate twice.
    modal.emit({ kind: 'close' })

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/processing',
      query: { cart: 'cart_1' },
    })
  })

  it('hides the BTCPay frame before routing to /processing', async () => {
    // The frame is mounted outside React under <body>: navigating while it is
    // still up renders /processing behind a fullscreen invoice.
    mockFetch.mockResolvedValue(sessionResponse())
    const hideFrame = stubBtcpayGlobal()
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalled())

    modal.emit({ kind: 'status', invoiceId: 'inv_test1', status: 'Settled' })

    expect(hideFrame).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(hideFrame.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]
    )
  })

  it('hands an invalid invoice over to /processing', async () => {
    // BTCPay marks an invoice Invalid when money arrived but the payment
    // failed (late, underpaid) — never re-enable checkout under it.
    mockFetch.mockResolvedValue(sessionResponse())
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalled())

    modal.emit({ kind: 'status', invoiceId: 'inv_test1', status: 'Invalid' })
    modal.emit({ kind: 'close' })

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/processing',
      query: { cart: 'cart_1' },
    })
    // The close must not fall through to the status check that re-enables.
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).includes('/api/store/cart/payment-status')
      )
    ).toBe(false)
  })

  it('hands over to /processing when a close-time check reports a payment issue', async () => {
    routeFetch({ statusState: 'payment_issue' })
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalled())

    modal.emit({ kind: 'close' })

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/processing',
        query: { cart: 'cart_1' },
      })
    )
  })

  it('quietly re-enables when the modal closes without payment', async () => {
    routeFetch()
    const modal = modalOpensAndCaptures()
    const onFailure = vi.fn()

    render(<BTCPayButton cartId="cart_1" onFailure={onFailure} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalled())

    modal.emit({ kind: 'status', invoiceId: 'inv_test1', status: 'New' })
    modal.emit({ kind: 'close' })

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Pay with Bitcoin' })
      ).not.toBeDisabled()
    )
    expect(mockPush).not.toHaveBeenCalled()
    // Closing is not a failure — no scary banner.
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith(null)
  })

  it('hands over to /processing when a close-time check finds the payment', async () => {
    // Wallet payment in flight: the modal never posted a paid status, but by
    // close time the backend already sees it.
    routeFetch({ statusState: 'confirming' })
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalled())

    modal.emit({ kind: 'close' })

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/processing',
        query: { cart: 'cart_1' },
      })
    )
  })

  it('mints a fresh session after the invoice expires in the modal', async () => {
    routeFetch()
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalledTimes(1))

    modal.emit({ kind: 'status', invoiceId: 'inv_test1', status: 'Expired' })
    modal.emit({ kind: 'close' })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Pay with Bitcoin' })
      ).not.toBeDisabled()
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    // A dead invoice must not be reopened — a second session POST happens.
    await waitFor(() => {
      const sessionPosts = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/api/store/cart/payment-sessions')
      )
      expect(sessionPosts).toHaveLength(2)
    })
  })

  it('reuses the same invoice when the customer clicks again after closing', async () => {
    routeFetch()
    const modal = modalOpensAndCaptures()

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))
    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalledTimes(1))
    modal.emit({ kind: 'close' })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Pay with Bitcoin' })
      ).not.toBeDisabled()
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() => expect(mockOpenBtcpayModal).toHaveBeenCalledTimes(2))
    // Session created once; the close-time status check is the only other
    // call — the second click reopens the remembered invoice.
    const sessionPosts = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/api/store/cart/payment-sessions')
    )
    expect(sessionPosts).toHaveLength(1)
  })

  it('falls back to the full-page redirect when the modal script fails', async () => {
    mockFetch.mockResolvedValue(sessionResponse())
    mockOpenBtcpayModal.mockRejectedValue(new Error('BTCPAY_MODAL_LOAD_FAILED'))
    const location = { href: '' }
    vi.stubGlobal('location', location)

    render(<BTCPayButton cartId="cart_1" onFailure={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() => expect(location.href).toBe(CHECKOUT_LINK))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects when the checkout link cannot be opened modally', async () => {
    // Mocked/e2e checkout serves plain-http, non-permalink links. There is no
    // origin or invoice id to hand the modal — redirect rather than throw.
    modalOpensAndCaptures()
    const mockedLink = 'http://127.0.0.1:9000/btcpay/checkout/inv_test1'
    const location = { href: '' }
    vi.stubGlobal('location', location)
    const onFailure = vi.fn()

    render(
      <BTCPayButton cartId="cart_1" checkoutLink={mockedLink} onFailure={onFailure} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() => expect(location.href).toBe(mockedLink))
    expect(mockOpenBtcpayModal).not.toHaveBeenCalled()
    // Redirecting is not a failure — no scary banner.
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith(null)
  })

  it('uses a caller-provided checkoutLink without creating a new session', async () => {
    modalOpensAndCaptures()

    render(
      <BTCPayButton
        cartId="cart_1"
        checkoutLink={CHECKOUT_LINK}
        onFailure={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    await waitFor(() =>
      expect(mockOpenBtcpayModal).toHaveBeenCalledWith(
        'https://btcpay.wcpos.com',
        'inv_test1',
        expect.any(Function)
      )
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
