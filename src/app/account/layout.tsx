import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AuthService } from '@/services/core/auth/auth-service'
import { AccountHeader } from '@/components/account/account-header'
import { AccountSidebar } from '@/components/account/account-sidebar'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication - this will be dynamic
  const user = await AuthService.getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - can be static */}
      <Suspense fallback={<div className="h-16 bg-white border-b animate-pulse" />}>
        <AccountHeader user={user} />
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