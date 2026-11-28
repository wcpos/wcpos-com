'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { currentItemClass } from '@/components/main/shell-parts'
import { cn } from '@/lib/utils'

const subscribeMounted = () => () => {}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('footer')

  // The persisted theme is only knowable client-side; render every option
  // unpressed on the server and during hydration so the markup matches.
  const mounted = useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false,
  )

  const options = [
    { value: 'light', icon: Sun, label: t('themeLight') },
    { value: 'dark', icon: Moon, label: t('themeDark') },
    { value: 'system', icon: Monitor, label: t('themeSystem') },
  ] as const

  // Labelled segments: a full-width row of 44px targets below lg (footer at
  // 390, phone menu), compact from lg. Selected uses the shell's "current"
  // tint; hover the one bg-muted fill.
  return (
    <div
      role="group"
      aria-label={t('theme')}
      className="grid w-full grid-cols-3 gap-1 rounded-md border p-1 lg:inline-flex lg:w-auto"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-1.5 rounded-sm px-2.5 text-[13px] font-medium transition-colors lg:h-auto lg:py-[5px]',
              active
                ? currentItemClass
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-pressed={active}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
