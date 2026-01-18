import { Suspense } from 'react'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'
import { ProfileEdit } from '@/components/account/profile-edit'
import { AddressManagement } from '@/components/account/address-management'

async function ProfileContent() {
  // Get unified customer data (wcpos-com + MedusaJS)
  const customer = await UnifiedCustomerService.getCurrentCustomer()
  
  if (!customer) {
    return null // Layout will handle redirect
  }

  // Get customer addresses from MedusaJS
  const addresses = customer.medusaCustomer?.addresses || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">
          Manage your personal information and addresses
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Information */}
        <ProfileEdit customer={customer} />
        
        {/* Address Management */}
        <AddressManagement userId={customer.id} addresses={addresses} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="h-96 bg-white rounded-lg border animate-pulse" />
          <div className="h-96 bg-white rounded-lg border animate-pulse" />
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}