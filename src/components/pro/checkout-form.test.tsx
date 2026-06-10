import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockConfirmPayment = vi.fn()

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="payment-element" />,
}))

const mockCompleteCart = vi.fn()

vi.mock('./complete-cart', () => ({
  completeCart: (...args: unknown[]) => mockCompleteCart(...args),
}))

import { CheckoutForm } from './checkout-form'
import { OrderPendingError } from './checkout-errors'

const onSuccess = vi.fn()
const onFailure = vi.fn()

function renderForm() {
  return render(
    <CheckoutForm
      cartId="cart_1"
      amount={129}
      currency="usd"
      experiment="pro_checkout_v1"
      experimentVariant="control"
      onSuccess={onSuccess}
      onFailure={onFailure}
    />
  )
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /pay/i }))
}

function lastFailure() {
  return onFailure.mock.calls[onFailure.mock.calls.length - 1][0]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('CheckoutForm', () => {
  it('clears any previous failure when a new attempt starts', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'succeeded' },
    })
    mockCompleteCart.mockResolvedValue('order_1')

    renderForm()
    submit()

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledWith(null)
  })

  it('completes the cart and reports success when payment succeeds', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'succeeded' },
    })
    mockCompleteCart.mockResolvedValue('order_42')

    renderForm()
    submit()

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('order_42'))
    expect(mockCompleteCart).toHaveBeenCalledWith({
      cartId: 'cart_1',
      experiment: 'pro_checkout_v1',
      experimentVariant: 'control',
    })
  })

  it('also completes the cart for requires_capture intents', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'requires_capture' },
    })
    mockCompleteCart.mockResolvedValue('order_43')

    renderForm()
    submit()

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('order_43'))
  })

  it('maps a declined card to a customer-safe retryable failure', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'RAW STRIPE INTERNAL MESSAGE',
      },
    })

    renderForm()
    submit()

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(2))

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).toContain('insufficient funds')
    expect(failure.message).not.toContain('RAW STRIPE INTERNAL MESSAGE')
    expect(failure.reference).toMatch(/^WCPOS-/)
    expect(mockCompleteCart).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('reports the distinct order-pending state when completion fails after payment', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'succeeded' },
    })
    mockCompleteCart.mockRejectedValue(new OrderPendingError('no order id'))

    renderForm()
    submit()

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(2))

    const failure = lastFailure()
    expect(failure.kind).toBe('order_pending')
    expect(failure.message.toLowerCase()).toContain('do not pay again')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('treats any post-payment completion error as order pending', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'succeeded' },
    })
    mockCompleteCart.mockRejectedValue(new TypeError('network down'))

    renderForm()
    submit()

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(2))
    expect(lastFailure().kind).toBe('order_pending')
  })

  it('reports a cautious failure for unexpected intent statuses', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'processing' },
    })

    renderForm()
    submit()

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(2))

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).toContain('contact support before trying again')
    expect(mockCompleteCart).not.toHaveBeenCalled()
  })

  it('reports a generic failure when confirmPayment throws', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('sdk exploded'))

    renderForm()
    submit()

    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(2))

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).not.toContain('sdk exploded')
  })

  it('re-enables the pay button after a failure so the customer can retry', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'card_declined' },
    })

    renderForm()
    submit()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /pay/i })).not.toBeDisabled()
    )
  })
})
