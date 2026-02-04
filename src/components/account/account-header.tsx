import Link from 'next/link'
import type { MedusaCustomer } from '@/lib/medusa-auth'

interface AccountHeaderProps {
  customer: MedusaCustomer
}

export function AccountHeader({ customer }: AccountHeaderProps) {
  return (
    <header className="bg-white border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            WCPOS
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Account</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">{customer.email}</span>
          <form action="/api/auth/logout" method="GET">
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
