'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { Globe } from 'lucide-react'

export function LanguageSelector() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('footer')

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value as Locale

    void fetch('/api/account/locale', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: nextLocale }),
    }).catch(() => {
      // Anonymous visitors and transient failures should not block the visible
      // language change; the URL/cookie locale remains the immediate source of
      // truth for rendering.
    })

    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Globe className="h-3.5 w-3.5" />
      <select
        value={locale}
        onChange={onChange}
        aria-label={t('language')}
        className="cursor-pointer rounded-sm bg-transparent text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  )
}
