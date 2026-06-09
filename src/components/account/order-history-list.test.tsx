import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderHistoryList, type OrderHistoryOrder } from './order-history-list'

function makeOrder(overrides: Partial<OrderHistoryOrder> = {}): OrderHistoryOrder {
  return {
    id: 'order_123',
    display_id: 1042,
    status: 'completed',
    payment_status: 'captured',
    currency_code: 'usd',
    total: 129,
    created_at: '2026-01-15T00:00:00Z',
    items: [{ id: 'item_1' }],
    ...overrides,
  }
}

describe('OrderHistoryList', () => {
  it('shows an empty state with a link to WCPOS Pro when there are no orders', () => {
    render(<OrderHistoryList orders={[]} locale="en-US" />)

    expect(screen.getByText('No orders yet.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Invoices and receipts will appear here after your first purchase.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse WCPOS Pro' })
    ).toHaveAttribute('href', '/pro')
  })

  it('links each order to its detail page', () => {
    render(<OrderHistoryList orders={[makeOrder()]} locale="en-US" />)

    expect(screen.getByRole('link', { name: 'Order #1042' })).toHaveAttribute(
      'href',
      '/account/orders/order_123'
    )
  })

  it('renders a PDF receipt download link for each order', () => {
    render(
      <OrderHistoryList
        orders={[
          makeOrder(),
          makeOrder({ id: 'order_456', display_id: 1043 }),
        ]}
        locale="en-US"
      />
    )

    const firstReceipt = screen.getByRole('link', {
      name: 'Download receipt for order #1042',
    })
    expect(firstReceipt).toHaveAttribute(
      'href',
      '/api/account/orders/order_123/receipt'
    )

    const secondReceipt = screen.getByRole('link', {
      name: 'Download receipt for order #1043',
    })
    expect(secondReceipt).toHaveAttribute(
      'href',
      '/api/account/orders/order_456/receipt'
    )
  })

  it('shows order totals and payment status', () => {
    render(<OrderHistoryList orders={[makeOrder()]} locale="en-US" />)

    expect(screen.getByText('$129.00')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })
})
