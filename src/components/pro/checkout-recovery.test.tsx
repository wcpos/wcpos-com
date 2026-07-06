import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// Mock the locale-aware Link as a simple anchor
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { CheckoutErrorNotice, OrderPendingNotice } from './checkout-recovery'
import type { CheckoutFailure } from './checkout-safety'

const paymentFailed: CheckoutFailure = {
  kind: 'payment_failed',
  message: 'Your card was declined. Please try a different card or payment method.',
  reference: 'WCPOS-TEST-REF1',
}

const cancelled: CheckoutFailure = {
  kind: 'payment_cancelled',
  message: 'PayPal checkout was cancelled and you have not been charged.',
  reference: 'WCPOS-TEST-REF2',
}

const orderPending: CheckoutFailure = {
  kind: 'order_pending',
  message: 'Your payment was received, but we could not finish creating your order.',
  reference: 'WCPOS-TEST-REF3',
}

const uncertain: CheckoutFailure = {
  kind: 'payment_uncertain',
  message:
    "We couldn't confirm the status of your payment. If you think you may have been charged, please contact support before trying again.",
  reference: 'WCPOS-TEST-REF4',
}

describe('CheckoutErrorNotice', () => {
  it('shows the failure message as an alert', () => {
    render(<CheckoutErrorNotice failure={paymentFailed} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Payment unsuccessful')).toBeInTheDocument()
    expect(screen.getByText(paymentFailed.message)).toBeInTheDocument()
  })

  it('tells the customer their cart is preserved for retry', () => {
    render(<CheckoutErrorNotice failure={paymentFailed} />)

    expect(
      screen.getByText(/your order details have been saved/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/try again without starting over/i)).toBeInTheDocument()
  })

  it('suggests switching payment method when others are available', () => {
    render(<CheckoutErrorNotice failure={paymentFailed} canSwitchMethod />)

    expect(
      screen.getByText(/choose a different payment method/i)
    ).toBeInTheDocument()
  })

  it('omits the switch-method hint when only one method exists', () => {
    render(<CheckoutErrorNotice failure={paymentFailed} canSwitchMethod={false} />)

    expect(
      screen.queryByText(/choose a different payment method/i)
    ).not.toBeInTheDocument()
  })

  it('links to support with the error reference', () => {
    render(<CheckoutErrorNotice failure={paymentFailed} />)

    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute('href', '/support?ref=WCPOS-TEST-REF1')
    expect(screen.getByText('WCPOS-TEST-REF1')).toBeInTheDocument()
  })

  it('renders uncertain payments as an alert without retry guidance', () => {
    render(<CheckoutErrorNotice failure={uncertain} canSwitchMethod />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Payment status unknown')).toBeInTheDocument()
    expect(screen.getByText(uncertain.message)).toBeInTheDocument()
    // Never invite a retry or a method switch — the charge may still complete
    // and paying again via another method would double-charge the customer.
    expect(
      screen.queryByText(/your order details have been saved/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/try again without starting over/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/choose a different payment method/i)
    ).not.toBeInTheDocument()
  })

  it('points uncertain payments at support with the error reference', () => {
    render(<CheckoutErrorNotice failure={uncertain} canSwitchMethod />)

    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute('href', '/support?ref=WCPOS-TEST-REF4')
    expect(screen.getByText('WCPOS-TEST-REF4')).toBeInTheDocument()
    expect(
      screen.getByText(/before you pay again/i)
    ).toBeInTheDocument()
  })

  it('renders cancellations as a calm status without a support link', () => {
    render(<CheckoutErrorNotice failure={cancelled} canSwitchMethod />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Payment cancelled')).toBeInTheDocument()
    expect(screen.getByText(cancelled.message)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /contact support/i })
    ).not.toBeInTheDocument()
  })
})

describe('OrderPendingNotice', () => {
  it('shows the distinct payment-received state', () => {
    render(<OrderPendingNotice failure={orderPending} />)

    expect(
      screen.getByText('Payment received — order pending')
    ).toBeInTheDocument()
  })

  it('tells the customer not to pay again', () => {
    render(<OrderPendingNotice failure={orderPending} />)

    expect(screen.getByText(/do not pay again/i)).toBeInTheDocument()
  })

  it('links to support with the error reference', () => {
    render(<OrderPendingNotice failure={orderPending} />)

    const supportLink = screen.getByRole('link', { name: /contact support/i })
    expect(supportLink).toHaveAttribute('href', '/support?ref=WCPOS-TEST-REF3')
    expect(screen.getByText('WCPOS-TEST-REF3')).toBeInTheDocument()
  })

  it('offers no payment retry affordance', () => {
    render(<OrderPendingNotice failure={orderPending} />)

    expect(screen.queryByText(/try again/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument()
  })

  it('can reset a stale order-pending guard after support confirms it is safe', () => {
    const onReset = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)

    render(<OrderPendingNotice failure={orderPending} onReset={onReset} />)

    fireEvent.click(
      screen.getByRole('button', { name: /support told me to reset checkout/i })
    )

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Only reset checkout after support confirms')
    )
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('does not reset the stale order-pending guard when confirmation is cancelled', () => {
    const onReset = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)

    render(<OrderPendingNotice failure={orderPending} onReset={onReset} />)

    fireEvent.click(
      screen.getByRole('button', { name: /support told me to reset checkout/i })
    )

    expect(onReset).not.toHaveBeenCalled()
  })
})
