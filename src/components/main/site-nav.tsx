'use client'

import { useEffect, useRef, useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { cn } from '@/lib/utils'

export interface SiteNavLink {
  label: string
  href: string
  external?: boolean
  eventName?: string
  /** Brand-red emphasis (Pro) independent of the active page. */
  highlight?: boolean
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
// never shift.
function navItemClass(active: boolean, highlight?: boolean) {
  return cn(
    'relative rounded-full px-3 py-1.5 transition-colors',
    active
      ? 'text-wcpos-red-accent'
      : highlight
        ? 'text-primary'
        : 'text-muted-foreground hover:text-foreground'
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
      className="relative hidden items-center gap-1 text-sm font-medium md:flex"
      onPointerLeave={() => setHoveredHref(null)}
    >
      <span
        ref={spotRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 h-full rounded-full opacity-0',
          'transition-[left,width,background-color] duration-200 ease-out motion-reduce:transition-none',
          interactedHref ? 'bg-muted' : 'bg-primary/10'
        )}
      />
      {links.map((link) => {
        const active = isActive(pathname, link)
        const shared = {
          'aria-current': active ? ('page' as const) : undefined,
          className: navItemClass(active, link.highlight),
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
              {link.label}
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

/** Mobile sheet links with the matching active-page tint (no spotlight). */
export function MobileNavLinks({ links }: { links: SiteNavLink[] }) {
  const pathname = usePathname()

  return (
    <>
      {links.map((link) => {
        const active = isActive(pathname, link)
        const className = cn(
          '-mx-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-wcpos-red-accent'
            : link.highlight
              ? 'text-primary hover:bg-muted'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
        const ariaCurrent = active ? ('page' as const) : undefined

        if (link.external) {
          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={ariaCurrent}
              className={className}
            >
              {link.label}
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
              {link.label}
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
            {link.label}
          </Link>
        )
      })}
    </>
  )
}
