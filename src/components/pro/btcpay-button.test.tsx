import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BTCPayButton } from './btcpay-button'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('BTCPayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows non-spinner loading state while preparing checkout', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))

    render(<BTCPayButton cartId="cart_1" onError={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pay with Bitcoin' }))

    expect(
      screen.getByRole('button', { name: 'Preparing Bitcoin payment...' })
    ).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })
})
