'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { locales, localeNames, type Locale } from '@/i18n/config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { currentItemClass } from '@/components/main/shell-parts'
import { cn } from '@/lib/utils'

const fieldClass =
  'rounded-md border bg-background text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const iconClass = 'size-3.5 shrink-0 text-muted-foreground'

/**
 * Language field: below lg (footer at 390, phone menu) the native picker,
 * drawn as a full-width 44px field; from lg a list that marks the current
 * language with the shell's "current" tint.
 */
export function LanguageSelector() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('footer')

  function switchLocale(nextLocale: Locale) {
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
    <>
      <div className="relative w-full lg:hidden">
        <Globe
          aria-hidden="true"
          className={cn(iconClass, 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2')}
        />
        <select
          value={locale}
          onChange={(e) => switchLocale(e.target.value as Locale)}
          aria-label={t('language')}
          className={cn(fieldClass, 'h-11 w-full cursor-pointer appearance-none pl-9 pr-9')}
        >
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {localeNames[loc]}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn(iconClass, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2')}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${t('language')}: ${localeNames[locale]}`}
          className={cn(
            fieldClass,
            'hidden h-[34px] items-center gap-2 px-2.5 data-[state=open]:bg-accent lg:inline-flex'
          )}
        >
          <Globe aria-hidden="true" className={iconClass} />
          {localeNames[locale]}
          <ChevronDown aria-hidden="true" className={cn(iconClass, 'ml-1.5')} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {locales.map((loc) => {
            const current = loc === locale
            return (
              <DropdownMenuItem
                key={loc}
                lang={loc}
                aria-current={current ? 'true' : undefined}
                onSelect={() => {
                  if (!current) switchLocale(loc)
                }}
                className={cn(
                  'pl-8',
                  current &&
                    cn(
                      currentItemClass,
                      'focus:bg-primary/10 focus:text-wcpos-red-accent dark:focus:bg-primary/15'
                    )
                )}
              >
                {current && (
                  <Check aria-hidden="true" className="absolute left-2" />
                )}
                {localeNames[loc]}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
