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
import { DesktopNav, MobileNavLinks } from '@/components/main/site-nav'

async function AuthButton({ signInLabel }: { signInLabel: string }) {
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
        {signInLabel}
      </TrackedLocaleLink>
    </Button>
  )
}

function AuthButtonFallback() {
  return <div className="h-9 w-9" />
}

export function SiteHeader() {
  const t = useTranslations('header')
  const tCommon = useTranslations('common')

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
          <DesktopNav links={navLinks} />
        </div>

        {/* Desktop Auth Button */}
        <div className="hidden md:block">
          <Suspense fallback={<AuthButtonFallback />}>
            <AuthButton signInLabel={tCommon('signIn')} />
          </Suspense>
        </div>

        {/* Mobile Hamburger */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">{tCommon('openMenu')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72" closeLabel={tCommon('close')}>
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              <WcposLogo className="h-6 w-6" />
              WCPOS
            </SheetTitle>
            <nav className="flex flex-col gap-1 mt-6">
              <MobileNavLinks links={navLinks} />
              <div className="border-t pt-4 mt-3">
                <Suspense fallback={<AuthButtonFallback />}>
                  <AuthButton signInLabel={tCommon('signIn')} />
                </Suspense>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
