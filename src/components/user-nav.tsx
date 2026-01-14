import Link from 'next/link'
import { User, LogOut, Settings } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User as UserType } from '@/services/core/database/schema'

interface UserNavProps {
  user: UserType
}

export function UserNav({ user }: UserNavProps) {
  const displayName = user.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user.email
  
  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.email[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar || undefined} alt={displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">{displayName}</div>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/api/auth/logout" method="post" className="w-full">
            <button type="submit" className="flex items-center w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}