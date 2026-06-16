'use client'

import { useRef } from 'react'
import { LogOut, User } from 'lucide-react'
import { Link } from '@/i18n/navigation'
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
  const signOutForm = useRef<HTMLFormElement>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Account menu"
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
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Real form POST so logout clears the session cookie and navigates,
            matching the previous header behaviour. */}
        <form
          ref={signOutForm}
          action="/api/auth/logout"
          method="POST"
          className="hidden"
        />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault()
            signOutForm.current?.submit()
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
