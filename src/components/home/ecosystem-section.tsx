import { useTranslations } from 'next-intl'
import { Apple, Smartphone, Monitor, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

type DeviceId = 'ios' | 'android' | 'desktop' | 'web'

interface Device {
  icon: LucideIcon
  id: DeviceId
  href: string
  badge: boolean
}

const devices: Device[] = [
  {
    icon: Apple,
    id: 'ios',
    href: 'https://testflight.apple.com/join/JGBdVRrW',
    badge: true,
  },
  {
    icon: Smartphone,
    id: 'android',
    href: 'https://play.google.com/apps/testing/com.wcpos.main',
    badge: true,
  },
  {
    icon: Monitor,
    id: 'desktop',
    href: 'https://github.com/wcpos/electron/releases',
    badge: false,
  },
  {
    icon: Globe,
    id: 'web',
    href: 'https://demo.wcpos.com/pos',
    badge: true,
  },
]

export function EcosystemSection() {
  const t = useTranslations('home.ecosystem')

  return (
    <Section tone="default" spacing="default">
      <SectionHeading
        className="mb-12"
        title={t('heading')}
        subtitle={t('subtitle')}
      />

      {/* Flow Diagram */}
      <div className="mb-12 flex flex-col items-center" aria-hidden="true">
        <div className="mb-4 rounded-md border border-purple-200 bg-purple-50 px-8 py-4 text-center dark:border-purple-800 dark:bg-purple-900/20">
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
            {t('flow.store')}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            {t('flow.plugin')}
          </p>
        </div>

        <div className="mb-4 flex flex-col items-center gap-1">
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {t('flow.sync')}
          </span>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="hidden h-px w-3/4 max-w-2xl bg-slate-300 dark:bg-slate-600 md:block" />
      </div>

      {/* Device Cards */}
      <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {devices.map((device) => (
          <li
            key={device.id}
            className="relative rounded-md border border-slate-200 bg-white p-5 text-center transition-colors hover:border-foreground/20 dark:border-slate-700 dark:bg-slate-800"
          >
            {device.badge && (
              <Badge variant="beta" className="absolute right-3 top-3">
                {t('badge')}
              </Badge>
            )}
            <device.icon
              aria-hidden="true"
              className="mx-auto mb-3 h-8 w-8 text-slate-600 dark:text-slate-300"
            />
            <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(`devices.${device.id}.label`)}
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t(`devices.${device.id}.description`)}
            </p>
            <a
              href={device.href}
              className="rounded text-xs font-medium text-wcpos-red hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
            >
              {t(`devices.${device.id}.cta`)} <span aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>

      {/* Explanatory text */}
      <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {t('description')}
      </p>
    </Section>
  )
}
