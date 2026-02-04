import Link from 'next/link'
import { Home, ShoppingBag, Key, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Overview', href: '/account', icon: Home },
  { name: 'Orders', href: '/account/orders', icon: ShoppingBag },
  { name: 'Licenses', href: '/account/licenses', icon: Key },
  { name: 'Profile', href: '/account/profile', icon: User },
]

export function AccountSidebar() {
  return (
    <nav className="p-4 space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Account
      </div>
      {navigation.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <Icon className="mr-3 h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
