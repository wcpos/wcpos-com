import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePayPalScriptReducer = vi.fn()

vi.mock('@paypal/react-paypal-js', () => ({
  usePayPalScriptReducer: () => mockUsePayPalScriptReducer(),
  PayPalButtons: () => <div data-testid="paypal-buttons">PayPal Buttons</div>,
}))

import { PayPalButton } from './paypal-button'

describe('PayPalButton', () => {
  it('shows a non-spinner pending placeholder while the SDK loads', () => {
    mockUsePayPalScriptReducer.mockReturnValue([{ isPending: true, isRejected: false }])

    render(
      <PayPalButton
        cartId="cart_1"
        onSuccess={() => {}}
        onError={() => {}}
      />
    )

    expect(
      screen.getByText('Loading PayPal secure checkout...')
    ).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })
})
