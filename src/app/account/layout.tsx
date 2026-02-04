import { getCustomer } from '@/lib/medusa-auth'
import { redirect } from 'next/navigation'
import { AccountHeader } from '@/components/account/account-header'
import { AccountSidebar } from '@/components/account/account-sidebar'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer()
  if (!customer) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <AccountHeader customer={customer} />
      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-65px)]">
          <AccountSidebar />
        </aside>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
