'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { Home, ShoppingBag, Key, User, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const navigation = [
  { key: 'overview', href: '/account', icon: Home },
  { key: 'orders', href: '/account/orders', icon: ShoppingBag },
  { key: 'licenses', href: '/account/licenses', icon: Key },
  { key: 'downloads', href: '/account/downloads', icon: Download },
  { key: 'profile', href: '/account/profile', icon: User },
] as const

function isActiveRoute(pathname: string, href: string): boolean {
  // Overview is the parent of every account route, so it only highlights on
  // an exact match; other items also match their nested routes (e.g.
  // /account/orders/123 keeps Orders highlighted).
  if (href === '/account') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Account navigation. Renders as a horizontally scrollable tab bar under the
 * account header on small screens, and as a vertical sidebar from md: up —
 * a single <nav> in the DOM, switched purely with responsive classes.
 */
export function AccountSidebar() {
  const t = useTranslations('account.nav')
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('title')}
      className="overflow-x-auto p-2 md:overflow-x-visible md:p-4"
    >
      <div className="mb-4 hidden text-xs font-semibold uppercase tracking-wide text-gray-500 md:block">
        {t('title')}
      </div>
      <ul className="flex w-max items-center gap-1 md:w-auto md:flex-col md:items-stretch md:gap-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = isActiveRoute(pathname, item.href)
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center whitespace-nowrap rounded-md px-3 py-3 text-sm font-medium transition-colors md:py-2',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="mr-2 h-4 w-4 shrink-0 md:mr-3" />
                {t(item.key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
