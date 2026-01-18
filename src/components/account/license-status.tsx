import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Key, Copy, ExternalLink, Calendar } from 'lucide-react'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'

interface LicenseStatusProps {
  userId: string
}

export async function LicenseStatus({ userId }: LicenseStatusProps) {
  // Get customer licenses from MedusaJS orders
  const licenses = await UnifiedCustomerService.getCustomerLicenses(userId)

  if (licenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            License Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
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
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="mr-2 h-5 w-5" />
          License Status
          <Badge className="ml-2 bg-green-100 text-green-800">
            {licenses.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {licenses.map((license) => (
          <div key={license.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{license.product}</h4>
                <p className="text-sm text-gray-600">
                  Purchased {new Date(license.orderDate).toLocaleDateString()}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            
            <div className="bg-gray-50 rounded p-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm text-gray-800 break-all">
                  {license.key}
                </div>
                <div className="flex space-x-2 ml-4">
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
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Order #{license.orderId.slice(-8)}
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/account/orders/${license.orderId}`}>
                  View Order <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/pro">Purchase Additional Licenses</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}