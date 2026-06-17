import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePayPalScriptReducer = vi.fn()
const capturePayPalButtonsProps = vi.fn()

vi.mock('@paypal/react-paypal-js', () => ({
  usePayPalScriptReducer: () => mockUsePayPalScriptReducer(),
  PayPalButtons: (props: Record<string, unknown>) => {
    capturePayPalButtonsProps(props)
    return <div data-testid="paypal-buttons">PayPal Buttons</div>
  },
}))

const mockCompleteCart = vi.fn()
const mockCreatePaymentSession = vi.fn()

vi.mock('./complete-cart', () => ({
  completeCart: (...args: unknown[]) => mockCompleteCart(...args),
  createPaymentSession: (...args: unknown[]) => mockCreatePaymentSession(...args),
}))

import { PayPalButton } from './paypal-button'
import { OrderPendingError } from './checkout-safety'

const onSuccess = vi.fn()
const onFailure = vi.fn()

interface CapturedPayPalProps {
  createOrder: () => Promise<string>
  onApprove: () => Promise<void>
  onError: (err: unknown) => void
  onCancel: () => void
}

function renderButton(paypalOrderId: string | null = 'PAYPAL_ORDER_1') {
  render(
    <PayPalButton
      cartId="cart_1"
      experiment="pro_checkout_v1"
      experimentVariant="control"
      paypalOrderId={paypalOrderId}
      onSuccess={onSuccess}
      onFailure={onFailure}
    />
  )
  return capturePayPalButtonsProps.mock.calls[0][0] as CapturedPayPalProps
}

function lastFailure() {
  return onFailure.mock.calls[onFailure.mock.calls.length - 1][0]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUsePayPalScriptReducer.mockReturnValue([{ isPending: false, isRejected: false }])
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('PayPalButton', () => {
  it('shows a non-spinner pending placeholder while the SDK loads', () => {
    mockUsePayPalScriptReducer.mockReturnValue([{ isPending: true, isRejected: false }])

    render(
      <PayPalButton
        cartId="cart_1"
        experiment="pro_checkout_v1"
        experimentVariant="control"
        onSuccess={() => {}}
        onFailure={() => {}}
      />
    )

    expect(
      screen.getByText('Loading PayPal secure checkout...')
    ).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('completes the cart and reports success on approval', async () => {
    mockCompleteCart.mockResolvedValue('order_7')

    const props = renderButton()
    await props.onApprove()

    expect(onSuccess).toHaveBeenCalledWith('order_7')
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('reports the distinct order-pending state when completion fails after approval', async () => {
    mockCompleteCart.mockRejectedValue(new OrderPendingError('no order id'))

    const props = renderButton()
    await props.onApprove()

    const failure = lastFailure()
    expect(failure.kind).toBe('order_pending')
    expect(failure.message.toLowerCase()).toContain('do not pay again')
    expect(failure.reference).toMatch(/^WCPOS-/)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('treats any post-approval completion error as order pending', async () => {
    mockCompleteCart.mockRejectedValue(new TypeError('network down'))

    const props = renderButton()
    await props.onApprove()

    expect(lastFailure().kind).toBe('order_pending')
  })

  it('maps createOrder failures to a customer-safe retryable failure', async () => {
    mockCreatePaymentSession.mockRejectedValue(new Error('Medusa 500 stack trace'))

    const props = renderButton(null)
    await expect(props.createOrder()).rejects.toThrow()

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).not.toContain('Medusa 500 stack trace')
    expect(failure.message).toContain('PayPal')
  })

  it('clears a previous failure when a new attempt starts', async () => {
    const props = renderButton()
    await props.createOrder()

    expect(onFailure).toHaveBeenCalledWith(null)
  })

  it('maps SDK errors to a customer-safe failure', () => {
    const props = renderButton()
    props.onError(new Error('paypal internal js error'))

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).not.toContain('paypal internal js error')
  })

  it('reports a createOrder failure once when the SDK echoes it through onError', async () => {
    const initError = new Error('Medusa 500 stack trace')
    mockCreatePaymentSession.mockRejectedValue(initError)

    const props = renderButton(null)
    await expect(props.createOrder()).rejects.toThrow()

    // One clear (null) + one failure report from the createOrder catch
    expect(onFailure).toHaveBeenCalledTimes(2)
    const reported = lastFailure()
    expect(reported.message).toContain("couldn't start the PayPal checkout")

    // The SDK re-reports the same rejection via onError — must be a no-op
    props.onError(initError)

    expect(onFailure).toHaveBeenCalledTimes(2)
    expect(lastFailure().reference).toBe(reported.reference)
    expect(lastFailure().message).toBe(reported.message)
  })

  it('still reports a later, unrelated SDK error after a deduped echo', async () => {
    mockCreatePaymentSession.mockRejectedValue(new Error('init failed'))

    const props = renderButton(null)
    await expect(props.createOrder()).rejects.toThrow()
    props.onError(new Error('echoed init failure')) // deduped echo

    const callsAfterEcho = onFailure.mock.calls.length
    props.onError(new Error('genuinely new sdk error'))

    expect(onFailure.mock.calls.length).toBe(callsAfterEcho + 1)
    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).toContain("PayPal couldn't complete your payment")
  })

  it('reports each createOrder attempt separately with its own reference', async () => {
    mockCreatePaymentSession.mockRejectedValue(new Error('init failed'))

    const props = renderButton(null)
    await expect(props.createOrder()).rejects.toThrow()
    const firstReference = lastFailure().reference

    // Customer retries; the new attempt reports its own failure even though
    // the previous flag was never consumed by an onError echo
    await expect(props.createOrder()).rejects.toThrow()
    const secondReference = lastFailure().reference

    expect(secondReference).toMatch(/^WCPOS-/)
    expect(secondReference).not.toBe(firstReference)
  })

  it('reports a calm cancelled state when the customer backs out', () => {
    const props = renderButton()
    props.onCancel()

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_cancelled')
    expect(failure.message).toContain('have not been charged')
  })
})
