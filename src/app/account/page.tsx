import { Suspense } from 'react'
import { AuthService } from '@/services/core/auth/auth-service'
import { AccountOverview } from '@/components/account/account-overview'
import { RecentOrders } from '@/components/account/recent-orders'
import { LicenseStatus } from '@/components/account/license-status'

export default async function AccountPage() {
  // Get user data - this will be dynamic
  const user = await AuthService.getCurrentUser()
  
  if (!user) {
    return null // Layout will handle redirect
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName || user.email}
        </h1>
        <p className="text-gray-600">
          Manage your account, orders, and licenses
        </p>
      </div>

      {/* Account Overview - can be partially static */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-48 bg-white rounded-lg border animate-pulse" />}>
            <AccountOverview user={user} />
          </Suspense>
        </div>
        
        <div>
          <Suspense fallback={<div className="h-48 bg-white rounded-lg border animate-pulse" />}>
            <LicenseStatus userId={user.id} />
          </Suspense>
        </div>
      </div>

      {/* Recent Orders - dynamic content */}
      <div>
        <Suspense fallback={<div className="h-64 bg-white rounded-lg border animate-pulse" />}>
          <RecentOrders userId={user.id} />
        </Suspense>
      </div>
    </div>
  )
}