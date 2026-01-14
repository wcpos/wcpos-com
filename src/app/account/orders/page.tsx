import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingBag, Eye, Search, Filter } from 'lucide-react'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

async function OrdersContent() {
  // Get current customer
  const customer = await UnifiedCustomerService.getCurrentCustomer()
  
  if (!customer) {
    return null // Layout will handle redirect
  }

  // Get all customer orders
  const orders = await UnifiedCustomerService.getCustomerOrders(customer.id, 50)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600">
            View and manage all your orders
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600 mb-4">
                You haven't placed any orders yet.
              </p>
              <Button asChild>
                <Link href="/pro">Browse Products</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600">
            View and manage all your orders ({orders.length} total)
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search orders by ID, product, or status..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Order #{order.display_id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge className={statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                    {order.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium text-lg">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: order.currency_code.toUpperCase(),
                    }).format(order.total / 100)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Items:</div>
                <div className="space-y-2">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-3">
                        {item.variant.product.thumbnail && (
                          <img
                            src={item.variant.product.thumbnail}
                            alt={item.title}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-gray-500">Qty: {item.quantity}</div>
                        </div>
                      </div>
                      <div className="font-medium">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: order.currency_code.toUpperCase(),
                        }).format(item.total / 100)}
                      </div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div>Payment: <span className="capitalize">{order.payment_status}</span></div>
                  <div>Fulfillment: <span className="capitalize">{order.fulfillment_status}</span></div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/account/orders/${order.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {orders.length >= 50 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Orders
          </Button>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
        <div className="h-20 bg-white rounded-lg border animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-lg border animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}