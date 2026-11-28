'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Menu, X } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { WcposLogo } from '@/components/icons/wcpos-logo'
import { currentItemClass, ExternalMark } from '@/components/main/shell-parts'
import { cn } from '@/lib/utils'

export interface SiteNavLink {
  label: string
  href: string
  external?: boolean
  eventName?: string
}

// Locale-stripped match (usePathname from next-intl drops the locale prefix);
// external links never count as the active page.
function isActive(pathname: string, link: SiteNavLink) {
  if (link.external) return false
  return pathname === link.href || pathname.startsWith(`${link.href}/`)
}

// No weight change between states — the active page reads by colour alone
// (wcpos-red-accent stays ≥4.5:1 on the bg-primary/10 tint in both themes,
// where plain --primary does not), and constant weight means link widths
// never shift. Every other link is muted, Pro included: only the current
// page reads as red, and Pro's emphasis is the filled Get Pro button.
function navItemClass(active: boolean) {
  return cn(
    'relative rounded-md px-3 py-1.5 transition-colors',
    active
      ? 'text-wcpos-red-accent'
      : 'text-muted-foreground hover:text-foreground'
  )
}

function NavLabel({ link }: { link: SiteNavLink }) {
  return (
    <>
      {link.label}
      {link.external && <ExternalMark />}
    </>
  )
}

/**
 * Desktop nav with a sliding spotlight: one pill glides between links on
 * hover, then settles on the active page as a brand tint when the pointer
 * leaves. Rendered with opacity 0 until the first client-side measurement,
 * so SSR markup is stable and there is no hydration jitter.
 */
export function DesktopNav({ links }: { links: SiteNavLink[] }) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement | null>(null)
  const spotRef = useRef<HTMLSpanElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>())
  // Pointer hover and keyboard focus are separate channels: a blur must not
  // clear pointer state (or the spotlight snaps home while the pointer is
  // still inside the nav), and vice versa. Focus wins while both are set.
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [focusedHref, setFocusedHref] = useState<string | null>(null)

  const activeHref =
    links.find((link) => isActive(pathname, link))?.href ?? null
  const interactedHref = focusedHref ?? hoveredHref
  const spotHref = interactedHref ?? activeHref

  useEffect(() => {
    const spot = spotRef.current
    if (!spot) return

    const position = () => {
      const target = spotHref ? itemRefs.current.get(spotHref) : undefined
      if (!target) {
        spot.style.opacity = '0'
        return
      }
      // Appearing from hidden: jump into place without a visible slide from
      // a stale position (also covers the initial settle on page load).
      const appearing = spot.style.opacity !== '1'
      if (appearing) spot.style.transition = 'none'
      spot.style.opacity = '1'
      spot.style.left = `${target.offsetLeft}px`
      spot.style.width = `${target.offsetWidth}px`
      if (appearing) {
        requestAnimationFrame(() => {
          spot.style.transition = ''
        })
      }
    }

    position()

    // Reposition when the nav re-measures (font load, locale change, resize).
    const nav = navRef.current
    if (typeof ResizeObserver === 'undefined' || !nav) return
    const observer = new ResizeObserver(position)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [spotHref])

  return (
    <nav
      ref={navRef}
      className="relative hidden items-center gap-1 text-sm font-medium lg:flex"
      onPointerLeave={() => setHoveredHref(null)}
    >
      <span
        ref={spotRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 h-full rounded-md opacity-0',
          'transition-[left,width,background-color] duration-200 ease-out motion-reduce:transition-none',
          interactedHref ? 'bg-muted' : 'bg-primary/10 dark:bg-primary/15'
        )}
      />
      {links.map((link) => {
        const active = isActive(pathname, link)
        const shared = {
          'aria-current': active ? ('page' as const) : undefined,
          className: navItemClass(active),
          onPointerEnter: () => setHoveredHref(link.href),
          onFocus: () => setFocusedHref(link.href),
          onBlur: () => setFocusedHref(null),
          ref: (el: HTMLAnchorElement | null) => {
            if (el) itemRefs.current.set(link.href, el)
            else itemRefs.current.delete(link.href)
          },
        }

        if (link.external) {
          return (
            <a key={link.href} href={link.href} {...shared}>
              <NavLabel link={link} />
            </a>
          )
        }
        if (link.eventName) {
          return (
            <TrackedLocaleLink
              key={link.href}
              href={link.href}
              eventName={link.eventName}
              eventProperties={{ location: 'desktop_header' }}
              {...shared}
            >
              {link.label}
            </TrackedLocaleLink>
          )
        }
        return (
          <Link key={link.href} href={link.href} {...shared}>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Phone menu rows: one row per nav link with a trailing chevron, hairlines
 * between rows, the shared "current" tint and the nav's bg-muted hover fill.
 */
export function MobileNavLinks({ links }: { links: SiteNavLink[] }) {
  const pathname = usePathname()

  return (
    <>
      {links.map((link) => {
        const active = isActive(pathname, link)
        const className = cn(
          '-mx-3 flex items-center justify-between border-b px-3 py-[13px] text-[17px] font-medium transition-colors',
          active
            ? cn(currentItemClass, 'rounded-md border-transparent')
            : 'hover:rounded-md hover:border-transparent hover:bg-muted'
        )
        const ariaCurrent = active ? ('page' as const) : undefined
        const content = (
          <>
            <span>
              <NavLabel link={link} />
            </span>
            <ChevronRight
              aria-hidden="true"
              className={cn('size-4', !active && 'text-muted-foreground')}
            />
          </>
        )

        if (link.external) {
          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={ariaCurrent}
              className={className}
            >
              {content}
            </a>
          )
        }
        if (link.eventName) {
          return (
            <TrackedLocaleLink
              key={link.href}
              href={link.href}
              eventName={link.eventName}
              eventProperties={{ location: 'mobile_menu' }}
              aria-current={ariaCurrent}
              className={className}
            >
              {content}
            </TrackedLocaleLink>
          )
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={ariaCurrent}
            className={className}
          >
            {content}
          </Link>
        )
      })}
    </>
  )
}

/**
 * Below lg: a labelled "Menu" button opening a full-screen panel. The panel
 * redraws the bar (logo, "Close") in the header's place so the button the
 * visitor pressed stays where it was.
 */
export function MobileMenu({
  menuLabel,
  closeLabel,
  children,
}: {
  menuLabel: string
  closeLabel: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="outline" className="h-11 px-3.5 [&_svg]:size-[18px]">
          <Menu aria-hidden="true" />
          {menuLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="full"
        hideClose
        closeLabel={closeLabel}
        // The layout keeps the header mounted across navigations, so the
        // panel would stay over the page a row just opened: close on the way out.
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) setOpen(false)
        }}
      >
        <div className="shrink-0 border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
              <WcposLogo className="h-7 w-7" />
              WCPOS
            </SheetTitle>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="h-11 px-3.5 [&_svg]:size-[18px]"
              >
                <X aria-hidden="true" />
                {closeLabel}
              </Button>
            </SheetClose>
          </div>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  )
}
