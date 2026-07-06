import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

// Payment identifiers are host-resolved server-side and passed as a prop
// (see store-environment.ts); tests exercise the all-providers setup.
const ALL_PAYMENTS = {
  stripePublishableKey: 'pk_test_123',
  paypal: { clientId: 'paypal_test_client', environment: 'sandbox' as const },
  btcpayEnabled: true,
}

// Mock the locale-aware Link as a simple anchor
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string | { pathname: string }
    [key: string]: unknown
  }) => (
    <a href={typeof href === 'string' ? href : href.pathname} {...props}>
      {children}
    </a>
  ),
}))

// Mock payment providers to avoid loading Stripe/PayPal SDKs
vi.mock('./stripe-provider', () => ({
  StripeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock('./paypal-provider', () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
// Wallets talk to the Stripe SDK directly — inert in unit tests.
vi.mock('./checkout/express-checkout', () => ({
  ExpressCheckoutRow: () => null,
}))
vi.mock('./checkout-form', () => ({
  CheckoutForm: ({
    onSuccess,
    onFailure,
  }: {
    onSuccess: (id: string) => void
    onFailure: (failure: unknown) => void
  }) => (
    <div>
      <button
        data-testid="mock-pay-button"
        onClick={() => onSuccess('order-abc-123')}
      >
        Pay
      </button>
      <button
        data-testid="mock-fail-button"
        onClick={() =>
          onFailure({
            kind: 'payment_failed',
            message:
              'Your card was declined. Please try a different card or payment method.',
            reference: 'WCPOS-TEST-FAIL',
          })
        }
      >
        Fail
      </button>
      <button
        data-testid="mock-pending-button"
        onClick={() =>
          onFailure({
            kind: 'order_pending',
            message:
              'Your payment was received, but we could not finish creating your order.',
            reference: 'WCPOS-TEST-PENDING',
          })
        }
      >
        Pending
      </button>
    </div>
  ),
}))

const renderPayPalButton = vi.fn()
const renderBTCPayButton = vi.fn()

vi.mock('./paypal-button', () => ({
  PayPalButton: (props: Record<string, unknown>) => {
    renderPayPalButton(props)
    return <div data-testid="paypal-button">PayPal</div>
  },
}))
vi.mock('./btcpay-button', () => ({
  BTCPayButton: (props: Record<string, unknown>) => {
    renderBTCPayButton(props)
    return <div data-testid="btcpay-button">BTCPay</div>
  },
}))

import { CheckoutClient } from './checkout-client'
import {
  recordCheckoutFailure,
  restoreCheckoutSafetyState,
} from './checkout-safety'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function buildCheckoutCart({
  title = 'WCPOS Pro Lifetime',
  unitPrice = 129,
  itemTotal = 129,
  omitItemTotal = false,
  quantity = 1,
  cartTotal = 129,
  paymentSessions = [
    {
      provider_id: 'pp_stripe_stripe',
      data: { client_secret: 'pi_test_secret' },
    },
  ],
  legacyPaymentSessions,
  legacyPaymentSession,
}: {
  title?: string
  unitPrice?: number
  itemTotal?: number
  omitItemTotal?: boolean
  quantity?: number
  cartTotal?: number
  paymentSessions?: Array<{
    provider_id: string
    data: Record<string, unknown>
  }>
  legacyPaymentSessions?: Array<{
    provider_id: string
    data: Record<string, unknown>
  }>
  legacyPaymentSession?: { provider_id: string; data: Record<string, unknown> }
} = {}) {
  return {
    id: 'cart-123',
    items: [
      {
        id: 'item-1',
        title,
        quantity,
        unit_price: unitPrice,
        ...(omitItemTotal ? {} : { total: itemTotal }),
      },
    ],
    total: cartTotal,
    currency_code: 'usd',
    payment_collection: {
      id: 'pay-col-123',
      payment_sessions: paymentSessions,
    },
    ...(legacyPaymentSessions
      ? { payment_sessions: legacyPaymentSessions }
      : {}),
    ...(legacyPaymentSession ? { payment_session: legacyPaymentSession } : {}),
  }
}

function mockSuccessfulCheckoutInit(cart = buildCheckoutCart()) {
  // 1. POST /api/store/cart
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cart: { id: 'cart-123' } }),
  })
  // 2. POST /api/store/cart/line-items
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cart }),
  })
}

function renderSignedIn(props: Record<string, unknown> = {}) {
  return render(
    <CheckoutClient
      customerEmail="user@example.com"
      selectedOfferHandle="wcpos-pro-yearly"
      checkoutPath="/pro/checkout?product=wcpos-pro-yearly"
      experimentVariant="control"
      payments={ALL_PAYMENTS}
      {...props}
    />
  )
}

/**
 * Fills the billing step and continues to payment. Queues the billing
 * PATCH response and initial payment session (the 3rd and 4th fetches
 * after the 2 init calls).
 */
async function completeBillingStep(cartAfterBilling = buildCheckoutCart()) {
  await waitFor(() => {
    expect(screen.getByTestId('billing-step-form')).toBeInTheDocument()
  })

  fireEvent.change(screen.getByLabelText('First name'), {
    target: { value: 'Ada' },
  })
  fireEvent.change(screen.getByLabelText('Last name'), {
    target: { value: 'Lovelace' },
  })
  fireEvent.change(screen.getByLabelText('Address line 1'), {
    target: { value: '42 Wallaby Way' },
  })
  fireEvent.change(screen.getByLabelText('Address line 2'), {
    target: { value: 'Apt 7' },
  })
  fireEvent.change(screen.getByLabelText('City'), {
    target: { value: 'Sydney' },
  })
  fireEvent.change(screen.getByLabelText('State / Province / Region'), {
    target: { value: 'NSW' },
  })
  fireEvent.change(screen.getByLabelText('Postal code'), {
    target: { value: '2000' },
  })

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cart: cartAfterBilling }),
  })
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      cart: cartAfterBilling,
      paymentCollectionId: 'pay-col-123',
      clientSecret: 'pi_test_secret',
    }),
  })
  fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

  await waitFor(() => {
    expect(screen.getByTestId('checkout-step-3')).toHaveAttribute(
      'data-step-state',
      'active'
    )
  })
}

describe('CheckoutClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    window.history.pushState({}, '', '/pro/checkout?product=wcpos-pro-yearly')
  })

  it('starts at the billing step for signed-in customers with the account collapsed', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()

    expect(screen.getByTestId('checkout-step-1')).toHaveAttribute(
      'data-step-state',
      'done'
    )
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
      'data-step-state',
      'active'
    )
    expect(screen.getByTestId('billing-step-form')).toBeInTheDocument()

    // Cart initializes in the background while billing is on screen.
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/store/cart',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/store/cart/line-items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          cartId: 'cart-123',
          product: 'wcpos-pro-yearly',
          quantity: 1,
        }),
      })
    )
  })

  it('does not create a payment session before billing is submitted', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/store/cart/line-items',
        expect.objectContaining({ method: 'POST' })
      )
    })

    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).includes('/api/store/cart/payment-sessions')
      )
    ).toBe(false)
  })

  it('creates the cart in the provider-filter region when supplied', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn({ cartRegionId: 'reg_eu' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/store/cart',
        expect.objectContaining({ method: 'POST' })
      )
    })
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/store/cart',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          region_id: 'reg_eu',
          metadata: {
            experiment: 'pro_checkout_v1',
            variant: 'control',
          },
        }),
      })
    )
  })

  it('starts at the account step when signed out and creates the account inline', async () => {
    render(
      <CheckoutClient
        selectedOfferHandle="wcpos-pro-yearly"
        checkoutPath="/pro/checkout?product=wcpos-pro-yearly"
        experimentVariant="control"
        payments={ALL_PAYMENTS}
      />
    )

    expect(screen.getByTestId('checkout-step-1')).toHaveAttribute(
      'data-step-state',
      'active'
    )
    expect(screen.getByTestId('account-step-form')).toBeInTheDocument()
    // No cart is created before we know who is buying.
    expect(mockFetch).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'hunter2hunter2' },
    })

    // 1. register succeeds; then background cart init fires (2 calls).
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockSuccessfulCheckoutInit()
    fireEvent.click(
      screen.getByRole('button', { name: /create account & continue/i })
    )

    await waitFor(() => {
      expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
        'data-step-state',
        'active'
      )
    })
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/auth/register',
      expect.objectContaining({ method: 'POST' })
    )
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/store/cart',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('flips to sign-in mode when the account already exists', async () => {
    render(
      <CheckoutClient
        selectedOfferHandle="wcpos-pro-yearly"
        checkoutPath="/pro/checkout?product=wcpos-pro-yearly"
        experimentVariant="control"
        payments={ALL_PAYMENTS}
      />
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'existing@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-guess-1' },
    })

    // register -> 409 ACCOUNT_EXISTS
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Account exists', code: 'ACCOUNT_EXISTS' }),
    })
    fireEvent.click(
      screen.getByRole('button', { name: /create account & continue/i })
    )

    await waitFor(() => {
      expect(screen.getByTestId('account-exists-notice')).toBeInTheDocument()
    })

    // sign-in succeeds; background cart init follows
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    mockSuccessfulCheckoutInit()
    fireEvent.click(
      screen.getByRole('button', { name: /sign in & continue/i })
    )

    await waitFor(() => {
      expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
        'data-step-state',
        'active'
      )
    })
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('persists the billing address to the cart and collapses the step', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()

    await completeBillingStep()

    // The 3rd call is the billing PATCH.
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      '/api/store/cart',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          cartId: 'cart-123',
          billing_address: {
            first_name: 'Ada',
            last_name: 'Lovelace',
            address_1: '42 Wallaby Way',
            city: 'Sydney',
            postal_code: '2000',
            country_code: 'us',
            address_2: 'Apt 7',
            province: 'NSW',
          },
          // Always sent — an empty value clears a previously saved number.
          metadata: { taxNumber: '' },
        }),
      })
    )

    // Collapsed summary line with Edit
    expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
      'data-step-state',
      'done'
    )
    expect(
      screen.getByText('42 Wallaby Way, Apt 7, Sydney NSW 2000, US')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit Billing address' })
    ).toBeInTheDocument()
  })

  it('refreshes the cart and payment session after billing changes totals', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()

    await waitFor(() => {
      expect(screen.getAllByText('$129.00')).toHaveLength(2)
    })

    const recalculatedCart = buildCheckoutCart({
      cartTotal: 149,
      itemTotal: 129,
    })

    await completeBillingStep(recalculatedCart)

    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      '/api/store/cart/payment-sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          cartId: 'cart-123',
          provider_id: 'pp_stripe_stripe',
          paymentCollectionId: 'pay-col-123',
        }),
      })
    )
    expect(screen.getByText('$149.00')).toBeInTheDocument()
  })

  it('reports payment refresh failures separately from billing save failures', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()

    await waitFor(() => {
      expect(screen.getByTestId('billing-step-form')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Lovelace' },
    })
    fireEvent.change(screen.getByLabelText('Address line 1'), {
      target: { value: '42 Wallaby Way' },
    })
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Sydney' },
    })
    fireEvent.change(screen.getByLabelText('Postal code'), {
      target: { value: '2000' },
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cart: buildCheckoutCart() }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'payment refresh failed' }),
    })

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    expect(
      await screen.findByText(
        "Billing address was saved, but we couldn't prepare payment. Please try again."
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
      'data-step-state',
      'active'
    )
  })

  it('renders the payment method rows with card selected by default', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    expect(screen.getByTestId('payment-method-stripe')).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByTestId('payment-method-paypal')).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(screen.getByTestId('payment-method-btcpay')).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
  })

  it('renders the order summary from the cart', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()

    await waitFor(() => {
      expect(screen.getByText('WCPOS Pro Lifetime')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
    })
  })

  it('shows the static offer summary before the cart exists', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    renderSignedIn({
      offerSummary: {
        title: 'WCPOS Pro — Yearly',
        priceFormatted: '$129.00',
      },
    })

    expect(
      screen.getByText('WCPOS Pro — Yearly')
    ).toBeInTheDocument()
    expect(screen.getByText('$129.00')).toBeInTheDocument()
  })

  it('surfaces a cart-init failure with a back-to-pricing link', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    renderSignedIn()

    await waitFor(() => {
      const backLink = screen.getByRole('link', { name: /back to pricing/i })
      expect(backLink).toHaveAttribute('href', '/pro')
    })
  })

  it('shows success state with "Go to Licenses" link after payment', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    fireEvent.click(screen.getByTestId('mock-pay-button'))

    await waitFor(() => {
      expect(
        screen.getByText('Thank you for your purchase!')
      ).toBeInTheDocument()
      expect(screen.getByText('Order ID: order-abc-123')).toBeInTheDocument()
    })

    const licensesLink = screen.getByRole('link', { name: /go to licenses/i })
    expect(licensesLink).toHaveAttribute('href', '/account/licenses')
    const homeLink = screen.getByRole('link', { name: /return to home/i })
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('shows the no-product error when no offer is selected', async () => {
    render(
      <CheckoutClient
        checkoutPath="/pro/checkout"
        experimentVariant="control"
        payments={ALL_PAYMENTS}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No product selected')).toBeInTheDocument()
    })
  })

  it('falls back to unit price when Medusa omits line item total', async () => {
    mockSuccessfulCheckoutInit(
      buildCheckoutCart({
        title: 'WCPOS Pro Lifetime',
        unitPrice: 399,
        omitItemTotal: true,
        cartTotal: 399,
      })
    )
    renderSignedIn()

    await waitFor(() => {
      expect(screen.getByText('WCPOS Pro Lifetime')).toBeInTheDocument()
      expect(screen.queryByText('$NaN')).not.toBeInTheDocument()
    })
  })

  it('passes the paypal session order id to PayPalButton when selected', async () => {
    const cartWithPaypal = buildCheckoutCart({
      paymentSessions: [
        {
          provider_id: 'pp_stripe_stripe',
          data: { client_secret: 'pi_test_secret' },
        },
        { provider_id: 'pp_paypal_paypal', data: { id: 'PAYPAL_ORDER_123' } },
      ],
    })
    mockSuccessfulCheckoutInit(cartWithPaypal)
    renderSignedIn()
    await completeBillingStep()

    // Selecting PayPal re-creates the session; queue the switch response.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cart: cartWithPaypal,
        paymentCollectionId: 'pay-col-123',
      }),
    })
    fireEvent.click(screen.getByTestId('payment-method-paypal'))

    await waitFor(() => {
      expect(renderPayPalButton).toHaveBeenCalledWith(
        expect.objectContaining({
          paypalOrderId: 'PAYPAL_ORDER_123',
        })
      )
    })
  })

  it('falls back to legacy cart payment sessions when collection lacks paypal session', async () => {
    const legacyCart = buildCheckoutCart({
      paymentSessions: [
        {
          provider_id: 'pp_stripe_stripe',
          data: { client_secret: 'pi_test_secret' },
        },
      ],
      legacyPaymentSessions: [
        {
          provider_id: 'pp_paypal_paypal',
          data: { id: 'PAYPAL_ORDER_FALLBACK' },
        },
      ],
    })
    mockSuccessfulCheckoutInit(legacyCart)
    renderSignedIn()
    await completeBillingStep()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cart: legacyCart,
        paymentCollectionId: 'pay-col-123',
      }),
    })
    fireEvent.click(screen.getByTestId('payment-method-paypal'))

    await waitFor(() => {
      expect(renderPayPalButton).toHaveBeenCalledWith(
        expect.objectContaining({
          paypalOrderId: 'PAYPAL_ORDER_FALLBACK',
        })
      )
    })
  })

  it('falls back to singular legacy payment session when session arrays do not match', async () => {
    const legacyCart = buildCheckoutCart({
      paymentSessions: [
        {
          provider_id: 'pp_stripe_stripe',
          data: { client_secret: 'pi_test_secret' },
        },
      ],
      legacyPaymentSessions: [
        {
          provider_id: 'pp_stripe_stripe',
          data: { client_secret: 'pi_legacy_secret' },
        },
      ],
      legacyPaymentSession: {
        provider_id: 'pp_paypal_paypal',
        data: { id: 'PAYPAL_ORDER_SINGULAR' },
      },
    })
    mockSuccessfulCheckoutInit(legacyCart)
    renderSignedIn()
    await completeBillingStep()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cart: legacyCart,
        paymentCollectionId: 'pay-col-123',
      }),
    })
    fireEvent.click(screen.getByTestId('payment-method-paypal'))

    await waitFor(() => {
      expect(renderPayPalButton).toHaveBeenCalledWith(
        expect.objectContaining({
          paypalOrderId: 'PAYPAL_ORDER_SINGULAR',
        })
      )
    })
  })

  it('passes the BTCPay checkout link to BTCPayButton when selected', async () => {
    const cartWithBtcpay = buildCheckoutCart({
      paymentSessions: [
        {
          provider_id: 'pp_stripe_stripe',
          data: { client_secret: 'pi_test_secret' },
        },
        {
          provider_id: 'pp_btcpay_btcpay',
          data: { checkoutLink: 'https://btcpay.wcpos.com/i/invoice_123' },
        },
      ],
    })
    mockSuccessfulCheckoutInit(cartWithBtcpay)
    renderSignedIn()
    await completeBillingStep()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cart: cartWithBtcpay,
        paymentCollectionId: 'pay-col-123',
      }),
    })
    fireEvent.click(screen.getByTestId('payment-method-btcpay'))

    await waitFor(() => {
      expect(renderBTCPayButton).toHaveBeenCalledWith(
        expect.objectContaining({
          checkoutLink: 'https://btcpay.wcpos.com/i/invoice_123',
        })
      )
    })
  })

  it('shows the method-switch failure notice when re-selecting a provider fails', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    fireEvent.click(screen.getByTestId('payment-method-paypal'))

    await waitFor(() => {
      expect(screen.getByText('Payment unsuccessful')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/couldn't prepare that payment method/i)
    ).toBeInTheDocument()
  })

  it('shows the recovery notice and preserves the cart when payment fails', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    fireEvent.click(screen.getByTestId('mock-fail-button'))

    await waitFor(() => {
      expect(screen.getByText('Payment unsuccessful')).toBeInTheDocument()
    })

    // Mapped, customer-safe message with a support reference
    expect(
      screen.getByText(
        'Your card was declined. Please try a different card or payment method.'
      )
    ).toBeInTheDocument()
    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute('href', '/support?ref=WCPOS-TEST-FAIL')

    // Multiple methods are enabled, so the switch-method hint shows
    expect(
      screen.getByText(/choose a different payment method/i)
    ).toBeInTheDocument()

    // The cart summary and payment form stay mounted for retry
    expect(screen.getByTestId('checkout-order-summary')).toBeInTheDocument()
    expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
  })

  it('shows the distinct order-pending state when completion fails after payment', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    fireEvent.click(screen.getByTestId('mock-pending-button'))

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })

    // The customer is told not to pay again, with a support reference
    expect(screen.getByText(/do not pay again/i)).toBeInTheDocument()
    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute(
      'href',
      '/support?ref=WCPOS-TEST-PENDING'
    )
    expect(screen.getByText('WCPOS-TEST-PENDING')).toBeInTheDocument()

    // The payment form is gone — no way to pay a second time
    expect(
      screen.queryByTestId('checkout-order-summary')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-pay-button')).not.toBeInTheDocument()
    expect(screen.queryByText('Payment unsuccessful')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /support told me to reset checkout/i })
    ).not.toBeInTheDocument()
  })

  it('persists the order-pending failure so a reload cannot re-enable payment', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    fireEvent.click(screen.getByTestId('mock-pending-button'))

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })

    const persisted = restoreCheckoutSafetyState()
    expect(persisted).toEqual({
      cartId: 'cart-123',
      failure: expect.objectContaining({
        kind: 'order_pending',
        reference: 'WCPOS-TEST-PENDING',
      }),
    })
  })

  it('does not persist plain payment failures', async () => {
    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    fireEvent.click(screen.getByTestId('mock-fail-button'))

    await waitFor(() => {
      expect(screen.getByText('Payment unsuccessful')).toBeInTheDocument()
    })

    expect(restoreCheckoutSafetyState()).toBeNull()
  })

  it('restores the order-pending state on reload without creating a new cart', async () => {
    recordCheckoutFailure('cart-old', {
      kind: 'order_pending',
      message:
        'Your payment was received, but we could not finish creating your order.',
      reference: 'WCPOS-RESTORED-PENDING',
    })

    renderSignedIn()

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })

    // The protective copy and the persisted reference both survive the reload
    expect(screen.getByText(/do not pay again/i)).toBeInTheDocument()
    expect(screen.getByText('WCPOS-RESTORED-PENDING')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /support told me to reset checkout/i })
    ).toBeInTheDocument()

    // No new cart or payment session is created — the customer cannot pay again
    expect(mockFetch).not.toHaveBeenCalled()
    expect(
      screen.queryByTestId('checkout-order-summary')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-pay-button')).not.toBeInTheDocument()
  })

  it('clears a stale order-pending state when opened with the support reset link', async () => {
    recordCheckoutFailure('cart-old', {
      kind: 'order_pending',
      message:
        'Your payment was received, but we could not finish creating your order.',
      reference: 'WCPOS-RESTORED-PENDING',
    })
    recordCheckoutFailure('cart-uncertain', {
      kind: 'payment_uncertain',
      message:
        "We couldn't confirm the status of your payment. If you think you may have been charged, please contact support before trying again.",
      reference: 'WCPOS-RESTORED-UNCERTAIN',
    })
    window.history.pushState(
      {},
      '',
      '/pro/checkout?product=wcpos-pro-yearly&reset_checkout=order_pending&checkout_ref=WCPOS-RESTORED-PENDING'
    )
    mockSuccessfulCheckoutInit()

    renderSignedIn({
      checkoutPath:
        '/pro/checkout?product=wcpos-pro-yearly&reset_checkout=order_pending&checkout_ref=WCPOS-RESTORED-PENDING',
    })

    await waitFor(() => {
      expect(screen.getByTestId('checkout-order-summary')).toBeInTheDocument()
    })
    expect(
      screen.queryByText('Payment received — order pending')
    ).not.toBeInTheDocument()
    expect(window.location.search).not.toContain('reset_checkout')
    expect(window.location.search).not.toContain('checkout_ref')
    const restored = restoreCheckoutSafetyState()
    expect(restored?.cartId).toBe('cart-uncertain')
    expect(restored?.failure.kind).toBe('payment_uncertain')
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/store/cart',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('does not clear a restored order-pending state from a guessable reset link', async () => {
    recordCheckoutFailure('cart-old', {
      kind: 'order_pending',
      message:
        'Your payment was received, but we could not finish creating your order.',
      reference: 'WCPOS-RESTORED-PENDING',
    })
    window.history.pushState(
      {},
      '',
      '/pro/checkout?product=wcpos-pro-yearly&reset_checkout=order_pending'
    )

    renderSignedIn({
      checkoutPath:
        '/pro/checkout?product=wcpos-pro-yearly&reset_checkout=order_pending',
    })

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })
    expect(screen.getByText('WCPOS-RESTORED-PENDING')).toBeInTheDocument()
    expect(window.location.search).not.toContain('reset_checkout')
    expect(restoreCheckoutSafetyState()?.cartId).toBe('cart-old')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not clear a restored order-pending state when the reset reference does not match', async () => {
    recordCheckoutFailure('cart-old', {
      kind: 'order_pending',
      message:
        'Your payment was received, but we could not finish creating your order.',
      reference: 'WCPOS-RESTORED-PENDING',
    })
    window.history.pushState(
      {},
      '',
      '/pro/checkout?product=wcpos-pro-yearly&reset_checkout=order_pending&checkout_ref=WCPOS-WRONG-REF'
    )

    renderSignedIn({
      checkoutPath:
        '/pro/checkout?product=wcpos-pro-yearly&reset_checkout=order_pending&checkout_ref=WCPOS-WRONG-REF',
    })

    await waitFor(() => {
      expect(
        screen.getByText('Payment received — order pending')
      ).toBeInTheDocument()
    })
    expect(screen.getByText('WCPOS-RESTORED-PENDING')).toBeInTheDocument()
    expect(window.location.search).not.toContain('reset_checkout')
    expect(window.location.search).not.toContain('checkout_ref')
    expect(restoreCheckoutSafetyState()?.cartId).toBe('cart-old')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('restores the uncertain-payment warning on reload while keeping checkout mounted', async () => {
    recordCheckoutFailure('cart-old', {
      kind: 'payment_uncertain',
      message:
        "We couldn't confirm the status of your payment. If you think you may have been charged, please contact support before trying again.",
      reference: 'WCPOS-RESTORED-UNCERTAIN',
    })

    mockSuccessfulCheckoutInit()
    renderSignedIn()

    // The warning is visible IMMEDIATELY — before the customer reaches the
    // payment step — so nobody fills in billing unaware a charge may exist.
    await waitFor(() => {
      expect(screen.getByText('Payment status unknown')).toBeInTheDocument()
    })
    expect(screen.getByText('WCPOS-RESTORED-UNCERTAIN')).toBeInTheDocument()

    await completeBillingStep()

    // Still visible on the payment step.
    expect(screen.getByText('Payment status unknown')).toBeInTheDocument()

    // The checkout itself still mounts (the warning withholds retry guidance,
    // but support may confirm the charge failed, so the form stays usable)
    expect(screen.getByTestId('checkout-order-summary')).toBeInTheDocument()
    expect(screen.getByTestId('mock-pay-button')).toBeInTheDocument()
  })

  it('clears the persisted protective state after a successful order', async () => {
    recordCheckoutFailure('cart-old', {
      kind: 'payment_uncertain',
      message: "We couldn't confirm the status of your payment.",
      reference: 'WCPOS-RESTORED-UNCERTAIN',
    })

    mockSuccessfulCheckoutInit()
    renderSignedIn()
    await completeBillingStep()

    fireEvent.click(screen.getByTestId('mock-pay-button'))

    await waitFor(() => {
      expect(
        screen.getByText('Thank you for your purchase!')
      ).toBeInTheDocument()
    })

    expect(restoreCheckoutSafetyState()).toBeNull()
  })
})
