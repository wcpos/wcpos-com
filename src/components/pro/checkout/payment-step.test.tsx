import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

const mockTrackClientEvent = vi.fn()
const mockGetPostHogSessionId = vi.fn()
const mockFetch = vi.fn()
const mockProviderInvocation = vi.fn()

vi.stubGlobal('fetch', mockFetch)

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: (...args: unknown[]) => mockTrackClientEvent(...args),
}))

vi.mock('@/lib/analytics/posthog-browser', () => ({
  getPostHogSessionId: () => mockGetPostHogSessionId(),
}))

vi.mock('@/lib/analytics/consent', () => ({
  isAnalyticsGranted: () => true,
  readAnalyticsConsent: () => 'granted',
}))

vi.mock('../stripe-provider', () => ({
  StripeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../paypal-provider', () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function AdapterControls({
  name,
  onAttempt,
  onFailure,
}: {
  name: string
  onAttempt: () => Promise<void> | void
  onFailure: (failure: null | {
    kind: 'payment_failed'
    message: string
    reference: string
  }) => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void Promise.resolve(onAttempt()).then(() =>
            mockProviderInvocation(name)
          )
        }
      >
        Attempt {name}
      </button>
      <button
        type="button"
        onClick={() =>
          onFailure({
            kind: 'payment_failed',
            message: 'customer safe',
            reference: 'WCPOS-PRIVATE',
          })
        }
      >
        Fail {name}
      </button>
      <button type="button" onClick={() => onFailure(null)}>
        Reset {name}
      </button>
    </div>
  )
}

vi.mock('../checkout-form', () => ({
  CheckoutForm: (props: Parameters<typeof AdapterControls>[0]) => (
    <AdapterControls {...props} name="stripe" />
  ),
}))

vi.mock('./express-checkout', () => ({
  ExpressCheckoutRow: (props: Parameters<typeof AdapterControls>[0]) => (
    <AdapterControls {...props} name="express" />
  ),
}))

vi.mock('../paypal-button', () => ({
  PayPalButton: (props: Parameters<typeof AdapterControls>[0]) => (
    <AdapterControls {...props} name="paypal" />
  ),
}))

vi.mock('../btcpay-button', () => ({
  BTCPayButton: (props: Parameters<typeof AdapterControls>[0]) => (
    <AdapterControls {...props} name="btcpay" />
  ),
}))

import { PaymentStep, type PaymentMethod } from './payment-step'

const onFailure = vi.fn()

function renderStep(method: PaymentMethod = 'stripe') {
  return render(
    <PaymentStep
      cartId="cart_private"
      clientSecret="pi_secret_private"
      customerSessionClientSecret={null}
      paypalOrderId="paypal_private"
      btcpayCheckoutLink="https://btcpay.example/i/private"
      method={method}
      onMethodChange={() => {}}
      isProcessing={false}
      enabled={{ stripe: true, paypal: true, btcpay: true }}
      stripePublishableKey="pk_test"
      paypal={{ clientId: 'paypal-client', environment: 'sandbox' }}
      plan="yearly"
      locale="fr-fr"
      experiment="pro_checkout_v1"
      experimentVariant="value_copy"
      amount={129}
      currency="usd"
      onSuccess={() => {}}
      onFailure={onFailure}
    />
  )
}

describe('PaymentStep checkout lifecycle analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPostHogSessionId.mockReturnValue(
      '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c'
    )
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attributed: true }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refreshes current attribution before capturing one safe provider start', async () => {
    let releaseRefresh!: () => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseRefresh = () =>
          resolve({
            ok: true,
            json: async () => ({ attributed: true }),
          })
      })
    )

    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Attempt stripe' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
    releaseRefresh()
    await waitFor(() => expect(mockTrackClientEvent).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockProviderInvocation).toHaveBeenCalledWith('stripe'))
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/store/cart/analytics-attribution',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: 'cart_private',
          session_id: '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c',
        }),
        signal: expect.any(AbortSignal),
      }
    )
    expect(mockTrackClientEvent).toHaveBeenCalledWith(
      'checkout_payment_started',
      {
        payment_provider: 'stripe',
        plan: 'yearly',
        experiment: 'pro_checkout_v1',
        variant: 'value_copy',
        locale: 'fr-FR',
      }
    )
    expect(mockTrackClientEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mockProviderInvocation.mock.invocationCallOrder[0]
    )
  })

  it('aborts a never-settling refresh and proceeds without claiming a tracked start', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    mockFetch.mockImplementationOnce(
      (_url: string, init?: { signal?: AbortSignal }) => {
        signal = init?.signal
        return new Promise(() => {})
      }
    )

    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Attempt stripe' }))

    expect(mockTrackClientEvent).not.toHaveBeenCalled()
    expect(mockProviderInvocation).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(999)
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
    expect(mockProviderInvocation).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(signal?.aborted).toBe(true)
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
    expect(mockProviderInvocation).toHaveBeenCalledWith('stripe')
  })

  it('normalizes a Stripe Express start to stripe', async () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Attempt express' }))

    await waitFor(() =>
      expect(mockTrackClientEvent).toHaveBeenCalledWith(
        'checkout_payment_started',
        expect.objectContaining({ payment_provider: 'stripe' })
      )
    )
  })

  it('normalizes a Stripe Express failure to stripe', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Fail express' }))

    expect(mockTrackClientEvent).toHaveBeenCalledWith(
      'checkout_payment_failed',
      expect.objectContaining({
        payment_provider: 'stripe',
        failure_kind: 'payment_failed',
      })
    )
  })

  it('does not capture or refresh when merely selecting a payment method', () => {
    renderStep()

    fireEvent.click(screen.getByTestId('payment-method-paypal'))

    expect(mockTrackClientEvent).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['stripe', 'stripe'],
    ['paypal', 'paypal'],
    ['btcpay', 'btcpay'],
  ] as const)('captures a normalized %s failure once', (method, provider) => {
    renderStep(method)
    fireEvent.click(screen.getByRole('button', { name: `Fail ${method}` }))

    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(mockTrackClientEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackClientEvent).toHaveBeenCalledWith(
      'checkout_payment_failed',
      {
        payment_provider: provider,
        failure_kind: 'payment_failed',
        plan: 'yearly',
        experiment: 'pro_checkout_v1',
        variant: 'value_copy',
        locale: 'fr-FR',
      }
    )
    expect(JSON.stringify(mockTrackClientEvent.mock.calls)).not.toContain(
      'WCPOS-PRIVATE'
    )
  })

  it('forwards a null failure reset without emitting analytics', () => {
    renderStep('paypal')
    fireEvent.click(screen.getByRole('button', { name: 'Reset paypal' }))

    expect(onFailure).toHaveBeenCalledWith(null)
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
  })

  it('settles a failed attribution refresh without claiming a tracked start', async () => {
    mockFetch.mockRejectedValue(new Error('route unavailable'))

    renderStep('btcpay')
    fireEvent.click(screen.getByRole('button', { name: 'Attempt btcpay' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
    expect(mockProviderInvocation).toHaveBeenCalledWith('btcpay')
  })

  it('treats a non-OK refresh as unacknowledged while payment still proceeds', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    renderStep('stripe')
    fireEvent.click(screen.getByRole('button', { name: 'Attempt stripe' }))

    await waitFor(() => expect(mockProviderInvocation).toHaveBeenCalledWith('stripe'))
    expect(mockTrackClientEvent).not.toHaveBeenCalled()
  })
})
