import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const paymentModule = vi.hoisted(() => ({ loaded: false }))

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: () => null,
}))

vi.mock('./checkout/payment-step', () => {
  paymentModule.loaded = true
  return {
    PaymentStep: () => null,
  }
})

beforeEach(() => {
  paymentModule.loaded = false
  vi.resetModules()
})

it('does not load payment providers while the initial account step renders', async () => {
  const { CheckoutClient } = await import('./checkout-client')

  render(
    <CheckoutClient
      selectedOfferHandle="wcpos-pro-yearly"
      checkoutPath="/pro/checkout?product=wcpos-pro-yearly"
      experimentVariant="control"
      payments={{
        stripePublishableKey: 'pk_test_123',
        paypal: { clientId: 'paypal_test_client', environment: 'sandbox' },
        btcpayEnabled: true,
      }}
    />
  )

  expect(await screen.findByTestId('account-step-form')).toBeInTheDocument()

  expect(paymentModule.loaded).toBe(false)
})

it('offers a retry when the payment step chunk fails to load', async () => {
  const { PaymentStepLoading } = await import('./checkout-client')
  const retry = vi.fn()

  render(<PaymentStepLoading error={new Error('chunk failed')} retry={retry} />)

  expect(screen.getByRole('alert')).toHaveTextContent('errors.initializeFailed')
  fireEvent.click(screen.getByRole('button', { name: 'tryAgain' }))
  expect(retry).toHaveBeenCalledOnce()
})
