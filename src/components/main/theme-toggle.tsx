'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslations } from 'next-intl'

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

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      {options.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={`rounded-sm p-1.5 transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={label}
            aria-label={label}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
