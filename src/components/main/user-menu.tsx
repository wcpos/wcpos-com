'use client'

import { useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  Download,
  Key,
  LayoutGrid,
  LogOut,
  ShoppingBag,
  User,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { localizeRedirectPath } from '@/lib/safe-redirect'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Labels for the account links, resolved on the server (account.nav). */
export interface AccountMenuLabels {
  account: string
  licenses: string
  proDownloads: string
  orders: string
  profile: string
}

// The sidebar's icons; "Pro downloads" so it never reads as the public
// Downloads page in the nav beside it.
const ACCOUNT_LINKS = [
  { key: 'account', href: '/account', Icon: LayoutGrid },
  { key: 'licenses', href: '/account/licenses', Icon: Key },
  { key: 'proDownloads', href: '/account/downloads', Icon: Download },
  { key: 'orders', href: '/account/orders', Icon: ShoppingBag },
  { key: 'profile', href: '/account/profile', Icon: User },
] as const

interface UserMenuProps {
  email: string
  avatarUrl: string
  initials: string
  labels: AccountMenuLabels
}

// Real form POST so logout clears the session cookie and navigates.
function useSignOutAction() {
  const locale = useLocale()
  return `/api/auth/logout?to=${encodeURIComponent(
    localizeRedirectPath('/login', locale)
  )}`
}

/**
 * Logged-in identity menu used in the shared SiteHeader, so the account
 * dropdown (email · account links · Sign out) is consistent on every page.
 */
export function UserMenu({ email, avatarUrl, initials, labels }: UserMenuProps) {
  const t = useTranslations('common')
  const signOutForm = useRef<HTMLFormElement>(null)
  const signOutAction = useSignOutAction()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('accountMenu')}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={email} />
            <AvatarFallback className="text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_LINKS.map(({ key, href, Icon }) => (
          <DropdownMenuItem key={key} asChild>
            <Link href={href}>
              <Icon className="text-muted-foreground" />
              {labels[key]}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form
          ref={signOutForm}
          action={signOutAction}
          method="POST"
          className="hidden"
        />
        {/* Signing out is not destructive: muted like a quiet row, the
            shared hover fill and full ink on focus. */}
        <DropdownMenuItem
          className="text-muted-foreground focus:bg-accent focus:text-foreground"
          onSelect={(event) => {
            event.preventDefault()
            signOutForm.current?.submit()
          }}
        >
          <LogOut />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The same account links inside the phone menu: who is signed in, the links
 * in two columns, and Sign out as its own last row under a hairline.
 */
export function MobileAccountMenu({
  email,
  avatarUrl,
  initials,
  labels,
}: UserMenuProps) {
  const t = useTranslations('common')
  const signOutAction = useSignOutAction()

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Avatar className="h-7 w-7">
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback className="text-2xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{email}</span>
      </div>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-4">
        {ACCOUNT_LINKS.map(({ key, href, Icon }) => (
          <li key={key} className="border-b last:border-b-0">
            <Link
              href={href}
              className="flex items-center gap-2.5 py-2.5 text-[15px] font-medium"
            >
              <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
              {labels[key]}
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOutAction} method="POST" className="mt-2 border-t">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {t('signOut')}
        </button>
      </form>
    </div>
  )
}
