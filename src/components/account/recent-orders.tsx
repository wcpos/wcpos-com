import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingBag, ExternalLink, Eye } from 'lucide-react'
import Link from 'next/link'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

interface RecentOrdersProps {
  userId: string
}

export async function RecentOrders({ userId }: RecentOrdersProps) {
  // Fetch recent orders from MedusaJS
  const orders = await UnifiedCustomerService.getCustomerOrders(userId, 5) // Get last 5 orders

  if (!orders.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              You haven&apos;t placed any orders yet.
            </p>
            <Button asChild>
              <Link href="/#pricing" className="inline-flex items-center">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Recent Orders
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/account/orders">
              View All
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="font-medium">#{order.display_id}</div>
                  <Badge className={statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                    {order.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                {order.items.map(item => item.title).join(', ')}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: order.currency_code.toUpperCase(),
                  }).format(order.total / 100)}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/account/orders/${order.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}