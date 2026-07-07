import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
}))

import { StripeProvider } from './stripe-provider'

describe('StripeProvider', () => {
  it('renders caller-provided localized copy when Stripe is not configured', () => {
    render(
      <StripeProvider
        clientSecret="pi_test_secret"
        customerSessionClientSecret={null}
        publishableKey={null}
        notConfiguredMessage="Localized no payment methods message"
      >
        <div>Payment form</div>
      </StripeProvider>
    )

    expect(
      screen.getByText('Localized no payment methods message')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Stripe is not configured for this environment.')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Payment form')).not.toBeInTheDocument()
  })
})
