import { useTranslations } from 'next-intl'
import { ThemeToggle } from './theme-toggle'
import { LanguageSelector } from './language-selector'

export function SiteFooter() {
  const t = useTranslations('footer')

  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t('copyright')}
          </p>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
