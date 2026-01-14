import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Copy, ExternalLink, Calendar, Search, Download } from 'lucide-react'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

async function LicensesContent() {
  // Get current customer
  const customer = await UnifiedCustomerService.getCurrentCustomer()
  
  if (!customer) {
    return null // Layout will handle redirect
  }

  // Get all customer licenses
  const licenses = await UnifiedCustomerService.getCustomerLicenses(customer.id)

  if (licenses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Keys</h1>
          <p className="text-gray-600">
            Manage your WCPOS Pro licenses
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Licenses Found</h3>
              <p className="text-gray-600 mb-4">
                You don&apos;t have any WCPOS Pro licenses yet.
              </p>
              <Button asChild>
                <Link href="/pro">Get WCPOS Pro</Link>
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
          <h1 className="text-2xl font-bold text-gray-900">License Keys</h1>
          <p className="text-gray-600">
            Manage your WCPOS Pro licenses ({licenses.length} active)
          </p>
        </div>
        <Button asChild>
          <Link href="/pro">
            <ExternalLink className="mr-2 h-4 w-4" />
            Purchase More
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search licenses by product name or license key..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* License Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{licenses.length}</div>
                <div className="text-sm text-gray-600">Active Licenses</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {new Set(licenses.map(l => l.product)).size}
                </div>
                <div className="text-sm text-gray-600">Products Licensed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center">
              <Download className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {licenses.filter(l => l.product.includes('Lifetime')).length}
                </div>
                <div className="text-sm text-gray-600">Lifetime Licenses</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Licenses List */}
      <div className="space-y-4">
        {licenses.map((license) => (
          <Card key={license.id}>
            <CardContent className="py-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{license.product}</h3>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      Purchased {new Date(license.orderDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Order #{license.orderId.slice(-8)}
                    </div>
                  </div>
                </div>
              </div>

              {/* License Key */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">License Key:</div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm text-gray-800 break-all flex-1 mr-4">
                      {license.key}
                    </div>
                    <div className="flex space-x-2">
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
              </div>

              {/* License Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  License ID: <span className="font-mono">{license.id}</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/account/orders/${license.orderId}`}>
                      View Order
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    Download Receipt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">How to Use Your License</h4>
              <p className="text-sm text-gray-600 mb-3">
                Copy your license key and enter it in the WCPOS Pro plugin settings in your WordPress admin.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs/installation">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Installation Guide
                </Link>
              </Button>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Having Issues?</h4>
              <p className="text-sm text-gray-600 mb-3">
                If you&apos;re having trouble with your license, our support team is here to help.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/support">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LicensesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
        <div className="h-20 bg-white rounded-lg border animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-lg border animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-lg border animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <LicensesContent />
    </Suspense>
  )
}