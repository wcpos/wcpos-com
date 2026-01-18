import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'
import { AccountHeader } from '@/components/account/account-header'
import { AccountSidebar } from '@/components/account/account-sidebar'

async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  // Check authentication using unified customer service
  const customer = await UnifiedCustomerService.getCurrentCustomer()
  
  if (!customer) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - can be static */}
      <Suspense fallback={<div className="h-16 bg-white border-b animate-pulse" />}>
        <AccountHeader user={customer} />
      </Suspense>
      
      <div className="flex">
        {/* Sidebar - can be static */}
        <div className="w-64 bg-white border-r min-h-screen">
          <AccountSidebar />
        </div>
        
        {/* Main content - dynamic based on route */}
        <main className="flex-1 p-6">
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-32 bg-gray-200 rounded animate-pulse" />
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </Suspense>
  )
}