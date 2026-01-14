import { Suspense } from 'react'
import Link from 'next/link'
import { AuthService } from '@/services/core/auth/auth-service'
import { UserNav } from '@/components/user-nav'
import { Button } from '@/components/ui/button'

export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            WCPOS
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/#features" className="text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="/#pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900">
              Docs
            </Link>
            <Link href="/support" className="text-gray-600 hover:text-gray-900">
              Support
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <Suspense fallback={
            <Button variant="outline" size="sm" disabled>
              Loading...
            </Button>
          }>
            <AuthNav />
          </Suspense>
        </div>
      </div>
    </header>
  )
}

async function AuthNav() {
  const user = await AuthService.getCurrentUser()
  
  if (user) {
    return <UserNav user={user} />
  }

  return (
    <div className="flex items-center space-x-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">Get Started</Link>
      </Button>
    </div>
  )
}