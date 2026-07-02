import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { getCustomer } from '@/lib/medusa-auth'
import {
  getCustomerAvatarUrl,
  getCustomerInitials,
} from '@/lib/customer-avatar'
import { UserMenu } from '@/components/main/user-menu'
import { WcposLogo } from '@/components/icons/wcpos-logo'

async function AuthButton() {
  let customer = null
  try {
    customer = await getCustomer()
  } catch {
    // Cookie/customer read failed — fall through to Sign In
  }

  if (customer) {
    return (
      <UserMenu
        email={customer.email}
        avatarUrl={getCustomerAvatarUrl(customer)}
        initials={getCustomerInitials(customer)}
      />
    )
  }

  return (
    <Button size="sm" asChild>
      <TrackedLocaleLink href="/login" eventName="click_sign_in">
        Sign In
      </TrackedLocaleLink>
    </Button>
  )
}

function AuthButtonFallback() {
  return <div className="h-9 w-9" />
}

// The highlighted link (Pro) carries the brand red; everything else stays muted.
function navLinkClass(highlight?: boolean) {
  return highlight
    ? 'text-primary transition-colors hover:text-primary/80'
    : 'text-muted-foreground transition-colors hover:text-foreground'
}

export function SiteHeader() {
  const t = useTranslations('header')

  // Journey order: try → upgrade → learn → get help → what's coming.
  const navLinks = [
    { label: t('downloads'), href: '/downloads' },
    { label: t('pro'), href: '/pro', eventName: 'click_pro_cta', highlight: true },
    { label: t('documentation'), href: 'https://docs.wcpos.com', external: true },
    { label: t('support'), href: '/support' },
    { label: t('roadmap'), href: '/roadmap' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <WcposLogo className="h-7 w-7" />
            WCPOS
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  className={navLinkClass(link.highlight)}
                >
                  {link.label}
                </a>
              ) : (
                link.eventName ? (
                  <TrackedLocaleLink
                    key={link.href}
                    href={link.href}
                    eventName={link.eventName}
                    className={navLinkClass(link.highlight)}
                  >
                    {link.label}
                  </TrackedLocaleLink>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={navLinkClass(link.highlight)}
                  >
                    {link.label}
                  </Link>
                )
              )
            )}
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
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              <WcposLogo className="h-6 w-6" />
              WCPOS
            </SheetTitle>
            <nav className="flex flex-col gap-4 mt-6">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`${navLinkClass(link.highlight)} text-sm font-medium`}
                  >
                    {link.label}
                  </a>
                ) : (
                  link.eventName ? (
                    <TrackedLocaleLink
                      key={link.href}
                      href={link.href}
                      eventName={link.eventName}
                      className={`${navLinkClass(link.highlight)} text-sm font-medium`}
                    >
                      {link.label}
                    </TrackedLocaleLink>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${navLinkClass(link.highlight)} text-sm font-medium`}
                    >
                      {link.label}
                    </Link>
                  )
                )
              )}
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
