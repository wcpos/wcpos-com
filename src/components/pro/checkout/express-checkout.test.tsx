import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import frMessages from '../../../../messages/fr.json'

const mockConfirmPayment = vi.fn()
const mockConfirmEvent = vi.fn()

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => ({}),
  ExpressCheckoutElement: ({
    onReady,
    onConfirm,
  }: {
    onReady: (event: { availablePaymentMethods: Record<string, unknown> }) => void
    onConfirm: (event: unknown) => void
  }) => {
    useEffect(() => {
      onReady({ availablePaymentMethods: { applePay: true } })
    }, [onReady])
    return (
      <button type="button" onClick={() => onConfirm(mockConfirmEvent())}>
        Confirm wallet
      </button>
    )
  },
}))

const mockCompleteCart = vi.fn()

vi.mock('../complete-cart', () => ({
  completeCart: (...args: unknown[]) => mockCompleteCart(...args),
}))

import { ExpressCheckoutRow } from './express-checkout'

const onSuccess = vi.fn()
const onFailure = vi.fn()
const onAttempt = vi.fn()
const billingAddress = {
  first_name: ' Ada ',
  last_name: ' Lovelace ',
  address_1: ' 42 Wallaby Way ',
  address_2: ' Checkout unit ',
  city: ' Sydney ',
  province: ' NSW ',
  postal_code: ' 2000 ',
  country_code: ' au ',
}

function renderExpressCheckout(locale: string, messages: typeof frMessages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ExpressCheckoutRow
        cartId="cart_1"
        experiment="pro_checkout_v1"
        experimentVariant="control"
        billingAddress={billingAddress}
        customerEmail=" buyer@example.com "
        onAttempt={onAttempt}
        onSuccess={onSuccess}
        onFailure={onFailure}
      />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirmEvent.mockReturnValue({})
})

describe('ExpressCheckoutRow', () => {
  it('preserves wallet billing details with checkout fields as fallback', async () => {
    mockConfirmEvent.mockReturnValueOnce({
      billingDetails: {
        name: ' Wallet Buyer ',
        email: ' wallet@example.com ',
        address: {
          line1: ' 1 Wallet Road ',
          line2: '',
          city: '',
          state: ' VIC ',
          postal_code: '',
          country: ' nz ',
        },
      },
    })
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'card_declined' },
    })

    renderExpressCheckout('fr', frMessages)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm wallet' }))

    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalled())
    expect(
      mockConfirmPayment.mock.calls[0][0].confirmParams.payment_method_data
        .billing_details
    ).toEqual({
      name: 'Wallet Buyer',
      email: 'wallet@example.com',
      address: {
        line1: '1 Wallet Road',
        line2: 'Checkout unit',
        city: 'Sydney',
        state: 'VIC',
        postal_code: '2000',
        country: 'NZ',
      },
    })
  })

  it('awaits one attempt callback before confirming a real wallet payment', async () => {
    let releaseAttempt!: () => void
    onAttempt.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseAttempt = resolve
      })
    )
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'card_declined' },
    })

    renderExpressCheckout('fr', frMessages)
    expect(onAttempt).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm wallet' }))

    expect(onAttempt).toHaveBeenCalledTimes(1)
    expect(mockConfirmPayment).not.toHaveBeenCalled()
    releaseAttempt()
    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalledTimes(1))
  })

  it('keeps Stripe wallet return URLs on the active locale route', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'card_declined' },
    })

    renderExpressCheckout('fr', frMessages)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm wallet' }))

    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalled())
    expect(mockConfirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: expect.objectContaining({
          return_url: 'http://localhost:3000/fr/pro/checkout/success',
        }),
      })
    )
  })
})
