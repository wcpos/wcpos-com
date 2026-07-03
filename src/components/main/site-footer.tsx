import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ThemeToggle } from './theme-toggle'
import { LanguageSelector } from './language-selector'
import { WcposLogo } from '@/components/icons/wcpos-logo'

export function SiteFooter() {
  const t = useTranslations('footer')

  const footerLinks = [
    { label: t('downloads'), href: '/downloads' },
    { label: t('about'), href: '/about-us' },
    { label: t('privacy'), href: '/privacy' },
    { label: t('terms'), href: '/terms' },
    { label: t('refunds'), href: '/refunds' },
  ]

  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-2">
              <WcposLogo className="h-5 w-5" />
              <p className="text-sm text-muted-foreground">
                {t('copyright')}
              </p>
            </div>
            <nav className="flex items-center gap-4">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
