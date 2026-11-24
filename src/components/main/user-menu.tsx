'use client'

import { useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LogOut, User } from 'lucide-react'
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

interface UserMenuProps {
  email: string
  avatarUrl: string
  initials: string
}

/**
 * Logged-in identity menu used in the shared SiteHeader, so the account
 * dropdown (email · Account · Sign out) is consistent on every page.
 */
export function UserMenu({ email, avatarUrl, initials }: UserMenuProps) {
  const locale = useLocale()
  const t = useTranslations('common')
  const signOutForm = useRef<HTMLFormElement>(null)
  const signOutAction = `/api/auth/logout?to=${encodeURIComponent(
    localizeRedirectPath('/login', locale)
  )}`

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
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User />
            {t('account')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Real form POST so logout clears the session cookie and navigates,
            matching the previous header behaviour. */}
        <form
          ref={signOutForm}
          action={signOutAction}
          method="POST"
          className="hidden"
        />
        {/* wcpos-red-accent on the primary/10 tint stays at least 4.5:1 in both
            themes; text-destructive was 2.0:1 on the dark popover. The tint is
            faint in dark, so keyboard focus also draws a red outline. */}
        <DropdownMenuItem
          className="text-wcpos-red-accent focus:bg-primary/10 focus:text-wcpos-red-accent focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wcpos-red-accent"
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
