import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

const capturePayPalSessionProps = vi.fn()
const mockHandleClick = vi.fn()
const mockHandleCancel = vi.fn()
let mockPayPalState = {
  isHydrated: true,
  loadingStatus: 'resolved',
  sdkError: null as Error | null,
  error: null as Error | null,
  isPending: false,
}

vi.mock('@paypal/react-paypal-js/sdk-v6', () => ({
  INSTANCE_LOADING_STATE: {
    PENDING: 'pending',
    RESOLVED: 'resolved',
    REJECTED: 'rejected',
  },
  usePayPal: () => ({
    isHydrated: mockPayPalState.isHydrated,
    loadingStatus: mockPayPalState.loadingStatus,
    error: mockPayPalState.sdkError,
  }),
  usePayPalOneTimePaymentSession: (props: Record<string, unknown>) => {
    capturePayPalSessionProps(props)
    return {
      error: mockPayPalState.error,
      isPending: mockPayPalState.isPending,
      handleClick: mockHandleClick,
      handleCancel: mockHandleCancel,
    }
  },
}))

const mockCompleteCart = vi.fn()
const mockCreatePaymentSession = vi.fn()
const mockCapturePayPalOrder = vi.fn()

vi.mock('./complete-cart', () => ({
  completeCart: (...args: unknown[]) => mockCompleteCart(...args),
  createPaymentSession: (...args: unknown[]) => mockCreatePaymentSession(...args),
  capturePayPalOrder: (...args: unknown[]) => mockCapturePayPalOrder(...args),
}))

import { PayPalButton } from './paypal-button'
import { OrderPendingError } from './checkout-safety'
import { CheckoutConsentWithdrawalBlockedError } from '@/lib/analytics/checkout-payment-lifecycle'

const onSuccess = vi.fn()
const onFailure = vi.fn()
const onProcessingChange = vi.fn()
const onAttempt = vi.fn()

interface CapturedPayPalProps {
  createOrder: () => Promise<{ orderId: string }>
  onApprove: (data?: { orderId?: string }) => Promise<void>
  onError: (err: unknown) => void
  onCancel: () => void
}

function buttonElement(paypalOrderId: string | null = 'PAYPAL_ORDER_1') {
  return (
    <PayPalButton
      cartId="cart_1"
      experiment="pro_checkout_v1"
      experimentVariant="control"
      paypalOrderId={paypalOrderId}
      onAttempt={onAttempt}
      onSuccess={onSuccess}
      onFailure={onFailure}
      onProcessingChange={onProcessingChange}
    />
  )
}

function renderButton(paypalOrderId: string | null = 'PAYPAL_ORDER_1') {
  render(buttonElement(paypalOrderId))
  return capturePayPalSessionProps.mock.calls[0][0] as CapturedPayPalProps
}

function lastFailure() {
  return onFailure.mock.calls[onFailure.mock.calls.length - 1][0]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHandleClick.mockResolvedValue(undefined)
  mockPayPalState = {
    isHydrated: true,
    loadingStatus: 'resolved',
    sdkError: null,
    error: null,
    isPending: false,
  }
  mockCapturePayPalOrder.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('PayPalButton', () => {
  it('invokes the PayPal SDK synchronously, then awaits attribution before creating the order', async () => {
    let releaseAttempt!: () => void
    onAttempt.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseAttempt = resolve
      })
    )

    const props = renderButton()
    expect(onAttempt).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('paypal-button')!)

    expect(mockHandleClick).toHaveBeenCalledTimes(1)
    expect(onAttempt).not.toHaveBeenCalled()

    const order = props.createOrder()
    expect(onAttempt).toHaveBeenCalledTimes(1)
    releaseAttempt()
    await expect(order).resolves.toEqual({ orderId: 'PAYPAL_ORDER_1' })
  })

  it('guards and disables synchronously so a double click starts PayPal once', async () => {
    let releaseAttempt!: () => void
    onAttempt.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseAttempt = resolve
      })
    )

    const props = renderButton()
    const button = document.querySelector('paypal-button')!
    fireEvent.click(button)
    fireEvent.click(button)

    expect(mockHandleClick).toHaveBeenCalledTimes(1)
    expect(onAttempt).not.toHaveBeenCalled()
    expect(button).toHaveAttribute('disabled')

    const order = props.createOrder()
    releaseAttempt()
    await expect(order).resolves.toEqual({ orderId: 'PAYPAL_ORDER_1' })
  })

  it('still creates the PayPal order when the analytics attempt callback fails', async () => {
    onAttempt.mockRejectedValueOnce(new Error('analytics unavailable'))

    const props = renderButton()
    fireEvent.click(document.querySelector('paypal-button')!)

    expect(mockHandleClick).toHaveBeenCalledTimes(1)
    await expect(props.createOrder()).resolves.toEqual({
      orderId: 'PAYPAL_ORDER_1',
    })
  })

  it('does not create a PayPal order when withdrawn consent cannot be cleared', async () => {
    onAttempt.mockRejectedValueOnce(
      new CheckoutConsentWithdrawalBlockedError()
    )

    const props = renderButton(null)
    await expect(props.createOrder()).rejects.toBeInstanceOf(
      CheckoutConsentWithdrawalBlockedError
    )
    expect(mockCreatePaymentSession).not.toHaveBeenCalled()
  })

  it('re-enables PayPal after an asynchronous SDK start rejection', async () => {
    mockHandleClick
      .mockRejectedValueOnce(new Error('popup blocked'))
      .mockResolvedValueOnce(undefined)

    renderButton()
    const button = document.querySelector('paypal-button')!
    fireEvent.click(button)

    await waitFor(() => expect(button).not.toHaveAttribute('disabled'))
    fireEvent.click(button)

    expect(mockHandleClick).toHaveBeenCalledTimes(2)
  })

  it('renders the v6 web component when the SDK session is ready', () => {
    renderButton()

    expect(document.querySelector('paypal-button')).toBeInTheDocument()
    expect(document.querySelector('paypal-button')).toHaveAttribute(
      'type',
      'checkout'
    )
  })

  it('shows a loading placeholder while the v6 SDK hydrates or initializes', () => {
    mockPayPalState.isPending = true

    renderButton()

    expect(
      screen.getByText('Loading PayPal secure checkout...')
    ).toBeInTheDocument()
    expect(document.querySelector('paypal-button')).not.toBeInTheDocument()
  })

  it('shows a visible fallback when the v6 SDK session fails to initialize', () => {
    mockPayPalState.error = new Error('bad client/environment pair')

    renderButton()

    expect(
      screen.getByText('Failed to load PayPal. Please try another payment method.')
    ).toBeInTheDocument()
    expect(document.querySelector('paypal-button')).not.toBeInTheDocument()
  })

  it('shows a visible fallback when the v6 SDK itself fails to initialize', () => {
    mockPayPalState.loadingStatus = 'rejected'
    mockPayPalState.sdkError = new Error('PayPal SDK rejected')

    renderButton()

    expect(
      screen.getByText('Failed to load PayPal. Please try another payment method.')
    ).toBeInTheDocument()
    expect(document.querySelector('paypal-button')).not.toBeInTheDocument()
  })

  it('captures the PayPal order before completing the cart on approval', async () => {
    mockCapturePayPalOrder.mockResolvedValue(undefined)
    mockCompleteCart.mockResolvedValue('order_7')

    const props = renderButton()
    await props.onApprove()

    expect(mockCapturePayPalOrder).toHaveBeenCalledWith({
      cartId: 'cart_1',
      orderId: 'PAYPAL_ORDER_1',
    })
    expect(mockCompleteCart).toHaveBeenCalledWith({
      cartId: 'cart_1',
      experiment: 'pro_checkout_v1',
      experimentVariant: 'control',
    })
    expect(mockCapturePayPalOrder.mock.invocationCallOrder[0]).toBeLessThan(
      mockCompleteCart.mock.invocationCallOrder[0]
    )
    expect(onSuccess).toHaveBeenCalledWith('order_7')
    expect(onFailure).not.toHaveBeenCalled()
    expect(onProcessingChange.mock.calls).toEqual([[true], [false]])
  })

  it('keeps capture failures retryable because Medusa completion has not run yet', async () => {
    mockCapturePayPalOrder.mockRejectedValue(new Error('capture failed'))

    const props = renderButton()
    await props.onApprove()

    const failure = lastFailure()
    expect(failure.kind).toBe('payment_failed')
    expect(failure.message).toContain("PayPal couldn't complete your payment")
    expect(mockCompleteCart).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onProcessingChange.mock.calls).toEqual([[true], [false]])
  })

  it('holds the parent processing lock while capture and completion are in flight', async () => {
    let releaseCapture!: () => void
    mockCapturePayPalOrder.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseCapture = resolve
      })
    )
    mockCompleteCart.mockResolvedValue('order_7')

    const props = renderButton()
    const approval = props.onApprove()

    expect(onProcessingChange).toHaveBeenCalledWith(true)
    expect(onProcessingChange).not.toHaveBeenCalledWith(false)

    releaseCapture()
    await approval

    expect(onProcessingChange.mock.calls).toEqual([[true], [false]])
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

  it('keeps PayPal retry available when a retryable createOrder failure becomes hook error state', async () => {
    mockCreatePaymentSession.mockRejectedValue(new Error('Medusa 500 stack trace'))
    const view = render(buttonElement(null))
    const props = capturePayPalSessionProps.mock.calls[0][0] as CapturedPayPalProps

    await expect(props.createOrder()).rejects.toThrow()

    mockPayPalState.error = new Error('Medusa 500 stack trace')
    view.rerender(buttonElement(null))

    expect(document.querySelector('paypal-button')).toBeInTheDocument()
    expect(
      screen.queryByText('Failed to load PayPal. Please try another payment method.')
    ).not.toBeInTheDocument()
  })

  it('clears a previous failure when a new attempt starts', async () => {
    const props = renderButton()
    await expect(props.createOrder()).resolves.toEqual({
      orderId: 'PAYPAL_ORDER_1',
    })

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
