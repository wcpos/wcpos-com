import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { OrderHistoryList, type OrderHistoryOrder } from './order-history-list'

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

function makeOrder(overrides: Partial<OrderHistoryOrder> = {}): OrderHistoryOrder {
  return {
    id: 'order_123',
    displayId: 1042,
    createdAt: '2026-01-15T00:00:00Z',
    itemCount: 1,
    displayStatus: 'Paid',
    total: {
      amount: 129,
      currencyCode: 'usd',
    },
    licenses: [],
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

  it('shows the order number and a View link to the detail page', () => {
    render(<OrderHistoryList orders={[makeOrder()]} locale="en-US" />)

    // The order number is plain text, not a nested anchor; navigation is the
    // dedicated View link, kept a sibling of the Receipt button.
    expect(screen.getByText('Order #1042')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'View order #1042' })
    ).toHaveAttribute('href', '/account/orders/order_123')
  })

  it('renders a masked licence chip with product when the order produced one', () => {
    render(
      <OrderHistoryList
        orders={[
          makeOrder({
            licenses: [{ maskedKey: '****-****-1234', product: 'WCPOS Pro Yearly' }],
          }),
        ]}
        locale="en-US"
      />
    )

    expect(screen.getByText('****-****-1234')).toBeInTheDocument()
    expect(screen.getByText('WCPOS Pro Yearly')).toBeInTheDocument()
  })

  it('does not reuse React keys for licences with the same masked key', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <OrderHistoryList
        orders={[
          makeOrder({
            licenses: [
              { maskedKey: '****-****-1234', product: 'WCPOS Pro Yearly' },
              { maskedKey: '****-****-1234', product: 'WCPOS Pro Monthly' },
            ],
          }),
        ]}
        locale="en-US"
      />
    )

    const duplicateKeyMessages = consoleError.mock.calls
      .map(([message]) => String(message))
      .filter((message) =>
        message.includes('Encountered two children with the same key')
      )
    consoleError.mockRestore()

    expect(duplicateKeyMessages).toEqual([])
  })

  it('omits the licence chip when no licence metadata is present', () => {
    render(<OrderHistoryList orders={[makeOrder()]} locale="en-US" />)

    expect(screen.queryByText(/\*\*\*\*-\*\*\*\*-/)).not.toBeInTheDocument()
  })

  it('renders a PDF receipt download link for each order', () => {
    render(
      <OrderHistoryList
        orders={[
          makeOrder(),
          makeOrder({ id: 'order_456', displayId: 1043 }),
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
