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
    router.replace(pathname, { locale: e.target.value as Locale })
  }

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Globe className="h-3.5 w-3.5" />
      <select
        value={locale}
        onChange={onChange}
        aria-label={t('language')}
        className="bg-transparent text-sm cursor-pointer hover:text-foreground transition-colors focus:outline-none"
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
