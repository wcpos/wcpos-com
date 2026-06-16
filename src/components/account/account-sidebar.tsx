'use client'

import { useEffect, useRef } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { ShoppingBag, Key, User, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const navigation = [
  { key: 'licenses', href: '/account/licenses', icon: Key },
  { key: 'downloads', href: '/account/downloads', icon: Download },
  { key: 'orders', href: '/account/orders', icon: ShoppingBag },
  { key: 'profile', href: '/account/profile', icon: User },
] as const

function isActiveRoute(pathname: string, href: string): boolean {
  // An item also matches its nested routes (e.g. /account/orders/123 keeps
  // Orders highlighted). /account itself redirects to /account/licenses, so
  // it never needs to highlight as a standalone tab.
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
  const navRef = useRef<HTMLElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  // On phones the nav scrolls horizontally and the active tab (e.g.
  // Downloads, last in the row) can sit off-screen on load — center it.
  // Scroll ONLY the nav container: scrollIntoView would also walk scrollable
  // ancestors (the document) and fight back/forward scroll restoration.
  useEffect(() => {
    const nav = navRef.current
    const link = activeRef.current
    if (!nav || !link) return
    if (nav.scrollWidth <= nav.clientWidth) return
    const navRect = nav.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    nav.scrollLeft +=
      linkRect.left - navRect.left - (navRect.width - linkRect.width) / 2
  }, [pathname])

  return (
    <nav
      ref={navRef}
      aria-label={t('title')}
      className="-mx-4 overflow-x-auto border-b px-4 pb-2 md:sticky md:top-20 md:mx-0 md:overflow-x-visible md:border-b-0 md:px-0 md:pb-0"
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
                    ? 'bg-wcpos-red/10 text-wcpos-red-accent dark:bg-wcpos-red/15'
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
