import { Suspense } from 'react'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'
import { AccountOverview } from '@/components/account/account-overview'
import { RecentOrders } from '@/components/account/recent-orders'
import { LicenseStatus } from '@/components/account/license-status'

async function AccountContent() {
  // Get unified customer data (wcpos-com + MedusaJS)
  const customer = await UnifiedCustomerService.getCurrentCustomer()
  
  if (!customer) {
    return null // Layout will handle redirect
  }

  // Use MedusaJS customer data if available, fallback to wcpos-com data
  const displayName = customer.medusaCustomer?.first_name || customer.firstName || customer.email

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {displayName}
        </h1>
        <p className="text-gray-600">
          Manage your account, orders, and licenses
        </p>
      </div>

      {/* Account Overview - can be partially static */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-48 bg-white rounded-lg border animate-pulse" />}>
            <AccountOverview user={customer} />
          </Suspense>
        </div>
        
        <div>
          <Suspense fallback={<div className="h-48 bg-white rounded-lg border animate-pulse" />}>
            <LicenseStatus userId={customer.id} />
          </Suspense>
        </div>
      </div>

      {/* Recent Orders - dynamic content from MedusaJS */}
      <div>
        <Suspense fallback={<div className="h-64 bg-white rounded-lg border animate-pulse" />}>
          <RecentOrders userId={customer.id} />
        </Suspense>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-48 bg-white rounded-lg border animate-pulse" />
          </div>
          <div>
            <div className="h-48 bg-white rounded-lg border animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-white rounded-lg border animate-pulse" />
      </div>
    }>
      <AccountContent />
    </Suspense>
  )
}