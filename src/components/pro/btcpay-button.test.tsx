import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { BTCPayButton } from './btcpay-button'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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
})
