import Link from 'next/link'
import { FileDown, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatOrderAmount } from '@/lib/order-display'
import { formatDateForLocale } from '@/lib/date-format'
import { getOrderDisplayStatus } from '@/lib/order-status'

export interface OrderHistoryOrder {
  id: string
  display_id: number
  status: string
  payment_status?: string
  currency_code: string
  total: number
  created_at: string
  items: Array<{ id: string }>
}

interface OrderHistoryListProps {
  orders: OrderHistoryOrder[]
  locale: string
}

export function OrderHistoryList({ orders, locale }: OrderHistoryListProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No orders yet.</p>
          <p className="text-sm mt-1">
            Invoices and receipts will appear here after your first purchase.
          </p>
          <Link
            href="/pro"
            className="text-primary hover:underline mt-2 inline-block"
          >
            Browse WCPOS Pro
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="font-medium hover:underline"
                >
                  Order #{order.display_id}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatDateForLocale(order.created_at, locale)} —{' '}
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">
                    {formatOrderAmount(order.total, order.currency_code)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getOrderDisplayStatus(order)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/api/account/orders/${order.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Download receipt for order #${order.display_id}`}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Receipt (PDF)
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
