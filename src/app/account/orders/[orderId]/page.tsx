import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Package, CreditCard, Truck, Key, Copy } from 'lucide-react'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

interface OrderDetailsPageProps {
  params: Promise<{ orderId: string }>
}

async function OrderDetailsContent({ orderId }: { orderId: string }) {
  // Get current customer
  const customer = await UnifiedCustomerService.getCurrentCustomer()
  
  if (!customer) {
    return notFound()
  }

  // Get customer orders and find the specific order
  const orders = await UnifiedCustomerService.getCustomerOrders(customer.id, 100)
  const order = orders.find(o => o.id === orderId)

  if (!order) {
    return notFound()
  }

  // Get licenses for this order
  const allLicenses = await UnifiedCustomerService.getCustomerLicenses(customer.id)
  const orderLicenses = allLicenses.filter(license => license.orderId === orderId)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  }

  const paymentStatusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    captured: 'bg-green-100 text-green-800',
    authorized: 'bg-blue-100 text-blue-800',
    canceled: 'bg-red-100 text-red-800',
    requires_action: 'bg-orange-100 text-orange-800',
  }

  const fulfillmentStatusColors = {
    not_fulfilled: 'bg-gray-100 text-gray-800',
    partially_fulfilled: 'bg-yellow-100 text-yellow-800',
    fulfilled: 'bg-green-100 text-green-800',
    partially_shipped: 'bg-blue-100 text-blue-800',
    shipped: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/account">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Account
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.display_id}
            </h1>
            <p className="text-gray-600">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Badge className={statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
            {order.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-4 border-b last:border-b-0">
                    {item.variant.product.thumbnail && (
                      <Image
                        src={item.variant.product.thumbnail}
                        alt={item.title}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.variant.title}</p>
                      {item.variant.sku && (
                        <p className="text-xs text-gray-500">SKU: {item.variant.sku}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: order.currency_code.toUpperCase(),
                        }).format(item.unit_price / 100)}
                      </div>
                      <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                    </div>
                    <div className="text-right font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.currency_code.toUpperCase(),
                      }).format(item.total / 100)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Licenses */}
          {orderLicenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  License Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderLicenses.map((license) => (
                    <div key={license.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{license.product}</h4>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-sm text-gray-800 break-all">
                            {license.key}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(license.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="mr-2 h-5 w-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Order Status:</span>
                <Badge className={statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment Status:</span>
                <Badge className={paymentStatusColors[order.payment_status as keyof typeof paymentStatusColors] || 'bg-gray-100 text-gray-800'}>
                  {order.payment_status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Fulfillment Status:</span>
                <Badge className={fulfillmentStatusColors[order.fulfillment_status as keyof typeof fulfillmentStatusColors] || 'bg-gray-100 text-gray-800'}>
                  {order.fulfillment_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: order.currency_code.toUpperCase(),
                  }).format(order.subtotal / 100)}
                </span>
              </div>
              
              {order.tax_total > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tax:</span>
                  <span className="text-sm">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: order.currency_code.toUpperCase(),
                    }).format(order.tax_total / 100)}
                  </span>
                </div>
              )}
              
              {order.shipping_total > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Shipping:</span>
                  <span className="text-sm">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: order.currency_code.toUpperCase(),
                    }).format(order.shipping_total / 100)}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between font-medium">
                <span>Total:</span>
                <span>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: order.currency_code.toUpperCase(),
                  }).format(order.total / 100)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Email:</span>
                <div className="font-medium">{order.email}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Customer ID:</span>
                <div className="font-mono text-sm">{order.customer_id}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-96 bg-white rounded-lg border animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-white rounded-lg border animate-pulse" />
            <div className="h-48 bg-white rounded-lg border animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <OrderDetailsContent orderId={(await params).orderId} />
    </Suspense>
  )
}