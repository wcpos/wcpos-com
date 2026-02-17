'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, ShoppingBag, Key, User, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { setReactI18nextLanguage } from '@/i18n/react-i18next-client'

const navigation = [
  { key: 'ovw', href: '/account', icon: Home },
  { key: 'ord', href: '/account/orders', icon: ShoppingBag },
  { key: 'lic', href: '/account/licenses', icon: Key },
  { key: 'dls', href: '/account/downloads', icon: Download },
  { key: 'prf', href: '/account/profile', icon: User },
]

export function AccountSidebar() {
  const { t } = useTranslation()

  useEffect(() => {
    setReactI18nextLanguage(document.documentElement.lang || 'en')
  }, [])

  return (
    <nav className="space-y-2 p-4">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t('acct.nav.ttl')}
      </div>
      {navigation.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="mr-3 h-4 w-4" />
            {t(`acct.nav.${item.key}`)}
          </Link>
        )
      })}
    </nav>
  )
}
