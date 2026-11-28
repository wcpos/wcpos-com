import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { getCustomer } from '@/lib/medusa-auth'
import {
  getCustomerAvatarUrl,
  getCustomerInitials,
} from '@/lib/customer-avatar'
import {
  MobileAccountMenu,
  UserMenu,
  type AccountMenuLabels,
} from '@/components/main/user-menu'
import { WcposLogo } from '@/components/icons/wcpos-logo'
import { DesktopNav, MobileMenu, MobileNavLinks } from '@/components/main/site-nav'
import { LanguageSelector } from '@/components/main/language-selector'
import { ThemeToggle } from '@/components/main/theme-toggle'
import { ShellSetting } from '@/components/main/shell-parts'

interface AuthLabels {
  signIn: string
  getPro: string
  account: AccountMenuLabels
}

async function AuthButton({
  labels,
  inMenu = false,
}: {
  labels: AuthLabels
  /** The phone menu's layout: full-width buttons, account links as rows. */
  inMenu?: boolean
}) {
  let customer = null
  try {
    customer = await getCustomer()
  } catch {
    // Cookie/customer read failed — fall through to Sign In
  }

  if (customer) {
    const Menu = inMenu ? MobileAccountMenu : UserMenu
    return (
      <Menu
        email={customer.email}
        avatarUrl={getCustomerAvatarUrl(customer)}
        initials={getCustomerInitials(customer)}
        labels={labels.account}
      />
    )
  }

  const getPro = (
    <Button
      size={inMenu ? 'lg' : 'sm'}
      asChild
      className={inMenu ? 'h-11 px-4 text-[15px]' : undefined}
    >
      <TrackedLocaleLink href="/pro" eventName="click_pro_cta">
        {labels.getPro}
      </TrackedLocaleLink>
    </Button>
  )
  // Sign In is the same ghost text in the bar and the phone menu; Get Pro
  // stays the one filled button in either view.
  const signIn = (
    <Button
      size={inMenu ? 'lg' : 'sm'}
      variant="ghost"
      asChild
      className={inMenu ? 'h-11 px-4 text-[15px]' : undefined}
    >
      <TrackedLocaleLink href="/login" eventName="click_sign_in">
        {labels.signIn}
      </TrackedLocaleLink>
    </Button>
  )

  if (inMenu) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2">
        {signIn}
        {getPro}
      </div>
    )
  }
  return (
    <>
      {getPro}
      {signIn}
    </>
  )
}

function AuthButtonFallback() {
  return <div className="h-9 w-9" />
}

export function SiteHeader() {
  const t = useTranslations('header')
  const tCommon = useTranslations('common')
  const tAccount = useTranslations('account.nav')
  const tFooter = useTranslations('footer')

  // Journey order: try → upgrade → learn → get help → what's coming.
  const navLinks = [
    { label: t('downloads'), href: '/downloads' },
    { label: t('pro'), href: '/pro', eventName: 'click_pro_cta' },
    { label: t('documentation'), href: 'https://docs.wcpos.com', external: true },
    { label: t('support'), href: '/support' },
    { label: t('roadmap'), href: '/roadmap' },
  ]

  const authLabels: AuthLabels = {
    signIn: tCommon('signIn'),
    getPro: t('getPro'),
    account: {
      account: tCommon('account'),
      licenses: tAccount('licenses'),
      proDownloads: tAccount('proDownloads'),
      orders: tAccount('orders'),
      profile: tAccount('profile'),
    },
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <WcposLogo className="h-7 w-7" />
            WCPOS
          </Link>
          <DesktopNav links={navLinks} />
        </div>

        {/* Desktop nav and auth from lg: the longest locales (de, nl) need
            more than md's 768px for the labels plus Get Pro / Sign In. */}
        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <Suspense fallback={<AuthButtonFallback />}>
            <AuthButton labels={authLabels} />
          </Suspense>
        </div>

        <MobileMenu menuLabel={tCommon('menu')} closeLabel={tCommon('close')}>
          <div className="container mx-auto flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2">
            <nav className="flex flex-col">
              <MobileNavLinks links={navLinks} />
            </nav>
            <Suspense fallback={null}>
              <AuthButton labels={authLabels} inMenu />
            </Suspense>
            <div className="mt-auto flex flex-col gap-3.5 pt-5">
              <ShellSetting label={tFooter('language')}>
                <LanguageSelector />
              </ShellSetting>
              <ShellSetting label={tFooter('theme')}>
                <ThemeToggle />
              </ShellSetting>
            </div>
          </div>
        </MobileMenu>
      </div>
    </header>
  )
}
