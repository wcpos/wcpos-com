'use client'

import { useEffect, useRef } from 'react'
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
  const activeRef = useRef<HTMLAnchorElement>(null)

  // On phones the nav scrolls horizontally and the active tab (e.g.
  // Downloads, last in the row) can sit off-screen on load — bring it into
  // view. Vertical 'nearest' keeps the page itself from jumping; on md+ the
  // nav isn't scrollable, so this is a no-op.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <nav
      aria-label={t('title')}
      className="overflow-x-auto p-2 md:overflow-x-visible md:p-4"
    >
      <div className="mb-4 hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground md:block">
        {t('title')}
      </div>
      <ul className="flex w-max items-center gap-1 md:w-auto md:flex-col md:items-stretch md:gap-1.5">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = isActiveRoute(pathname, item.href)
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                ref={isActive ? activeRef : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center whitespace-nowrap rounded-md px-3 py-3 text-sm font-medium transition-colors md:py-2',
                  isActive
                    ? 'bg-wcpos-red/10 text-wcpos-red dark:bg-wcpos-red/15'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'mr-2 h-4 w-4 shrink-0 md:mr-3',
                    !isActive && 'text-muted-foreground/70'
                  )}
                />
                {t(item.key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
