import Link from 'next/link'
import { LayoutDashboard, Key, ScrollText } from 'lucide-react'

// Admin UI is intentionally hardcoded English (internal tooling).
const navigation = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Licenses', href: '/admin/licenses', icon: Key },
  { label: 'Logs', href: '/admin/logs', icon: ScrollText },
]

export function AdminSidebar() {
  return (
    <nav className="space-y-2 p-4">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Admin
      </div>
      {navigation.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Icon className="mr-3 h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
