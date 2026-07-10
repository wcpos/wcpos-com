import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import frMessages from '../../../../messages/fr.json'

const mockConfirmPayment = vi.fn()

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => ({}),
  ExpressCheckoutElement: ({
    onReady,
    onConfirm,
  }: {
    onReady: (event: { availablePaymentMethods: Record<string, unknown> }) => void
    onConfirm: () => void
  }) => {
    useEffect(() => {
      onReady({ availablePaymentMethods: { applePay: true } })
    }, [onReady])
    return <button type="button" onClick={onConfirm}>Confirm wallet</button>
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

function renderExpressCheckout(locale: string, messages: typeof frMessages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ExpressCheckoutRow
        cartId="cart_1"
        experiment="pro_checkout_v1"
        experimentVariant="control"
        onAttempt={onAttempt}
        onSuccess={onSuccess}
        onFailure={onFailure}
      />
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExpressCheckoutRow', () => {
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
