'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('footer')

  const options = [
    { value: 'light', icon: Sun, label: t('themeLight') },
    { value: 'dark', icon: Moon, label: t('themeDark') },
    { value: 'system', icon: Monitor, label: t('themeSystem') },
  ] as const

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`rounded-sm p-1.5 transition-colors ${
            theme === value
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={label}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
