import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('BTCPayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
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

  it('quietly re-enables when the modal closes without payment', async () => {
    mockFetch.mockResolvedValue(sessionResponse())
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

  it('reuses the same invoice when the customer clicks again after closing', async () => {
    mockFetch.mockResolvedValue(sessionResponse())
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
    // Session created once; second click reopens the remembered invoice.
    expect(mockFetch).toHaveBeenCalledTimes(1)
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
