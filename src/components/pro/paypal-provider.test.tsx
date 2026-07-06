import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const capturePayPalProviderProps = vi.fn()

vi.mock('@paypal/react-paypal-js/sdk-v6', () => ({
  PayPalProvider: (props: Record<string, unknown>) => {
    capturePayPalProviderProps(props)
    return <div data-testid="paypal-sdk-v6-provider">{props.children as React.ReactNode}</div>
  },
}))

import { PayPalProvider } from './paypal-provider'

describe('PayPalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes the PayPal React SDK v6 with an explicit environment', () => {
    render(
      <PayPalProvider
        config={{ clientId: 'client_live_123', environment: 'production' }}
      >
        <div>Pay with PayPal</div>
      </PayPalProvider>
    )

    expect(screen.getByTestId('paypal-sdk-v6-provider')).toBeInTheDocument()
    expect(capturePayPalProviderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client_live_123',
        environment: 'production',
        components: ['paypal-payments'],
        pageType: 'checkout',
      })
    )
  })

  it('does not load the SDK when PayPal is not configured', () => {
    render(
      <PayPalProvider config={null}>
        <div>No PayPal config</div>
      </PayPalProvider>
    )

    expect(screen.getByText('No PayPal config')).toBeInTheDocument()
    expect(capturePayPalProviderProps).not.toHaveBeenCalled()
  })
})
