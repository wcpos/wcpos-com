import { Suspense } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { getAuthToken } from '@/lib/medusa-auth'

const navLinks = [
  { label: 'Docs', href: 'https://docs.wcpos.com' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Pro', href: '/pro', umamiEvent: 'click-pro-cta' },
  { label: 'Support', href: 'https://docs.wcpos.com/support' },
]

async function AuthButton() {
  let token: string | null = null
  try {
    token = await getAuthToken()
  } catch {
    // Cookie read failed — fall through to Sign In
  }

  if (token) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/account">Account</Link>
      </Button>
    )
  }

  return (
    <Button size="sm" asChild data-umami-event="click-sign-in">
      <Link href="/login">Sign In</Link>
    </Button>
  )
}

function AuthButtonFallback() {
  return <div className="h-9 w-20" />
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            WCPOS
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
                {...(link.umamiEvent && { 'data-umami-event': link.umamiEvent })}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Auth Button */}
        <div className="hidden md:block">
          <Suspense fallback={<AuthButtonFallback />}>
            <AuthButton />
          </Suspense>
        </div>

        {/* Mobile Hamburger */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="text-lg font-bold">WCPOS</SheetTitle>
            <nav className="flex flex-col gap-4 mt-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  {...(link.umamiEvent && { 'data-umami-event': link.umamiEvent })}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t pt-4 mt-2">
                <Suspense fallback={<AuthButtonFallback />}>
                  <AuthButton />
                </Suspense>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
