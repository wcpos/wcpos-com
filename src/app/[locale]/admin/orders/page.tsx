import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import {
  medusaAdminClient,
  type AdminOrderSummary,
} from '@/services/core/external/medusa-admin-client'
import {
  MedusaAdminUnconfiguredCard,
  StateCard,
} from '@/components/admin/state-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatOrderAmount } from '@/lib/order-display'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { formatDateForLocale } from '@/lib/date-format'

const PAGE_SIZE = 20

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed
}

function OrdersTable({ orders }: { orders: AdminOrderSummary[] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    #{order.displayId ?? order.id}
                  </Link>
                </TableCell>
                <TableCell>{order.email ?? '—'}</TableCell>
                <TableCell>
                  {getOrderDisplayStatus({
                    status: order.status,
                    payment_status: order.paymentStatus ?? undefined,
                  })}
                </TableCell>
                <TableCell>
                  {formatOrderAmount(order.total, order.currencyCode)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {order.createdAt
                    ? formatDateForLocale(order.createdAt, 'en')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)

  const result = await medusaAdminClient.listOrders({
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {result.status === 'unconfigured' && <MedusaAdminUnconfiguredCard />}

      {result.status === 'error' && (
        <StateCard title="Failed to load orders" detail={result.message} />
      )}

      {result.status === 'ok' &&
        (result.items.length === 0 ? (
          <StateCard title="No orders found" detail="No orders exist yet." />
        ) : (
          <>
            <OrdersTable orders={result.items} />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page} · {result.count} order
                {result.count === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders?page=${page - 1}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {result.hasNextPage && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders?page=${page + 1}`}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        ))}
    </div>
  )
}
